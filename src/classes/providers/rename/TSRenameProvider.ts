import { ICustomTSField, ICustomTSMethod, UI5TSParser } from "ui5plugin-parser";
import {
	CustomTSClass,
	ICustomClassTSField,
	ICustomClassTSMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import {
	CustomTSObject,
	ICustomClassTSObjectField,
	ICustomClassTSObjectMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSObject";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { MethodDeclaration, Node, ts } from "ui5plugin-parser/dist/tsmorph";
import * as vscode from "vscode";
import { RangeAdapter } from "../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../ui5parser/ParserBearer";

interface IWorkspaceEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newValue: string;
}
export class TSRenameProvider extends ParserBearer<UI5TSParser> {
	async provideRenameEdits(
		renamedMemberDocument: vscode.TextDocument,
		renamedMemberPosition: vscode.Position,
		newMemberName: string
	): Promise<vscode.WorkspaceEdit | undefined> {
		const className = this._parser.fileReader.getClassNameFromPath(renamedMemberDocument.fileName);
		if (!className) {
			return;
		}
		this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(renamedMemberDocument));

		const UIClass = this._parser.classFactory.getUIClass(className);
		const isCustomTSClass = UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject;
		if (!isCustomTSClass) {
			return;
		}

		const offset = renamedMemberDocument.offsetAt(renamedMemberPosition);
		const members = [...UIClass.methods, ...UIClass.fields];
		const member = members.find(member => {
			return (
				member.node &&
				member.node.getNameNode().getStart() <= offset &&
				member.node.getNameNode().getEnd() >= offset
			);
		});

		const currentDocumentMemberWasRenamed = member?.node;
		const anotherDocumentMemberWasRenamed = !member;

		if (currentDocumentMemberWasRenamed) {
			return this._handleCurrentDocumentMemberRename(renamedMemberDocument, member, newMemberName, className);
		} else if (anotherDocumentMemberWasRenamed) {
			const memberOwner = await this._getMemberOwner(UIClass, offset);
			if (!memberOwner) {
				return;
			}

			return await this.provideRenameEdits(memberOwner.document, memberOwner.position, newMemberName);
		}
	}

	private _handleCurrentDocumentMemberRename(
		document: vscode.TextDocument,
		member: ICustomClassTSField | ICustomClassTSObjectMethod | ICustomClassTSObjectField,
		newName: string,
		className: string
	) {
		const workspaceEdits = this._getMemberNameRenames(document, member, newName, className);
		const uniqueWorkspaceEdits = this._removeOverlapingEdits(workspaceEdits);

		let workspaceEdit: vscode.WorkspaceEdit | undefined = new vscode.WorkspaceEdit();
		if (uniqueWorkspaceEdits.length > 0) {
			uniqueWorkspaceEdits.forEach(workspaceEditEntry => {
				workspaceEdit?.replace(workspaceEditEntry.uri, workspaceEditEntry.range, workspaceEditEntry.newValue);
			});
		} else {
			workspaceEdit = undefined;
		}

		return workspaceEdit;
	}

	private _getMemberNameRenames(
		document: vscode.TextDocument,
		member: ICustomClassTSField | ICustomClassTSObjectMethod | ICustomClassTSObjectField,
		newName: string,
		className: string
	) {
		const workspaceEdits: IWorkspaceEdit[] = [];
		this._getTextEditsForTSFiles(document, member, newName, workspaceEdits);
		this._addTextEditsForXMLFiles(className, member.name, newName, workspaceEdits);

		return workspaceEdits;
	}

	private _getTextEditsForTSFiles(
		document: vscode.TextDocument,
		member: ICustomClassTSField | ICustomClassTSObjectMethod | ICustomClassTSObjectField,
		newName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		if (!member.node) {
			return;
		}

		const renameLocations =
			this._parser.getProject(document.uri.fsPath)?.getLanguageService().findRenameLocations(member.node) ?? [];

		const wsEdits = renameLocations.map(renameLocation => {
			const renameStart = renameLocation.getTextSpan().getStart();
			const renameEnd = renameLocation.getTextSpan().getEnd();
			const range = RangeAdapter.tsOffsetsToVSCodeRange(renameStart, renameEnd, renameLocation.getSourceFile());

			const wsEdit: IWorkspaceEdit = {
				uri: vscode.Uri.file(renameLocation.compilerObject.fileName),
				newValue: newName,
				range: range
			};

			return wsEdit;
		});

		workspaceEdits.push(...wsEdits);
	}

	private _addTextEditsForXMLFiles(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		const UIClass = this._parser.classFactory.getUIClass(className);
		const isCustomClass = UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject;
		if (!isCustomClass) {
			return;
		}

		const fields: ICustomTSField[] = UIClass.fields;
		const methods: ICustomTSMethod[] = UIClass.methods;
		const member =
			methods.find(method => method.name === oldMemberName) ?? fields.find(field => field.name === oldMemberName);

		if (!member?.mentionedInTheXMLDocument) {
			return;
		}
		const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
			UIClass,
			[],
			true,
			true,
			true
		);

		const XMLFiles: IXMLFile[] = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
		XMLFiles.forEach(XMLFile => {
			this.addWorkspaceEditsForXMLDoc(XMLFile, oldMemberName, className, workspaceEdits, newMemberName);
		});
	}

	private addWorkspaceEditsForXMLDoc(
		XMLFile: IXMLFile,
		oldMemberName: string,
		className: string,
		workspaceEdits: IWorkspaceEdit[],
		newMemberName: string
	) {
		const tagsAndAttributes = this._parser.xmlParser.getXMLFunctionCallTagsAndAttributes(
			XMLFile,
			oldMemberName,
			className
		);

		tagsAndAttributes.forEach(tagAndAttribute => {
			const { tag, attributes } = tagAndAttribute;
			attributes.forEach(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const positionOfAttribute = tag.positionBegin + tag.text.indexOf(attribute);
				const positionOfValueBegin = positionOfAttribute + attribute.indexOf(attributeValue);
				const positionOfEventHandlerInAttributeValueBegin =
					positionOfValueBegin + attributeValue.indexOf(oldMemberName);
				const positionOfEventHandlerInAttributeValueEnd =
					positionOfEventHandlerInAttributeValueBegin + oldMemberName.length;
				const classUri = vscode.Uri.file(XMLFile.fsPath);
				const range = RangeAdapter.offsetsToVSCodeRange(
					XMLFile.content,
					positionOfEventHandlerInAttributeValueBegin,
					positionOfEventHandlerInAttributeValueEnd - 1
				);
				if (range) {
					workspaceEdits.push({
						uri: classUri,
						range: range,
						newValue: newMemberName
					});
				}
			});
		});
	}

	private _removeOverlapingEdits(workspaceEdits: IWorkspaceEdit[]) {
		return workspaceEdits.reduce((accumulator: IWorkspaceEdit[], workspaceEdit) => {
			const isOverlapingEdit = !!accumulator.find(workspaceEditInAccumulator => {
				return (
					workspaceEditInAccumulator.uri.path === workspaceEdit.uri.path &&
					workspaceEditInAccumulator.range.isEqual(workspaceEdit.range)
				);
			});

			if (!isOverlapingEdit) {
				accumulator.push(workspaceEdit);
			}

			return accumulator;
		}, []);
	}

	private async _getMemberOwner(UIClass: CustomTSClass | CustomTSObject, memberOffset: number) {
		const methods = UIClass.methods;
		const method = methods.find(method => {
			return (
				method.node instanceof MethodDeclaration &&
				(method.node.getBody()?.getStart() ?? -1) <= memberOffset &&
				(method.node.getBody()?.getEnd() ?? -1) >= memberOffset
			);
		}) as ICustomClassTSMethod | undefined;

		const methodNodeDoesNotExist = !method?.node;
		if (methodNodeDoesNotExist) {
			return;
		}

		const deepestChild = this._getDeepestChildAtPosition(method.node, memberOffset);
		const deepestChildIsNotIdentifier = !deepestChild?.isKind(ts.SyntaxKind.Identifier);
		if (deepestChildIsNotIdentifier) {
			return;
		}

		const identifier = deepestChild;
		const firstAncestor = identifier.getFirstAncestor();
		const ancestorType =
			firstAncestor && UIClass.typeChecker.compilerObject.getTypeAtLocation(firstAncestor.compilerNode);
		const ancestorSymbol = ancestorType?.getSymbol();
		const declaration = ancestorSymbol?.declarations?.[0];
		const sourceFile = declaration?.getSourceFile();
		const ancestorFileName = sourceFile?.fileName;
		const ancestorClassName = ancestorFileName && this._parser.fileReader.getClassNameFromPath(ancestorFileName);
		const ancestorUIClass = ancestorClassName && this._parser.classFactory.getUIClass(ancestorClassName);

		const ancestorIsNotTSClass = !(
			ancestorUIClass instanceof CustomTSClass || ancestorUIClass instanceof CustomTSObject
		);
		if (ancestorIsNotTSClass) {
			return;
		}

		const members = [...ancestorUIClass.methods, ...ancestorUIClass.fields];
		const member = members.find(member => member.name === identifier.getText());
		const nameNode = member?.node?.getNameNode();
		const startOffset = nameNode?.getStart();

		const uri = vscode.Uri.file(ancestorUIClass.fsPath);
		const document = await vscode.workspace.openTextDocument(uri);
		const position = startOffset && document.positionAt(startOffset);

		if (position) {
			return { document, position };
		}
	}

	private _getDeepestChildAtPosition(node: Node | undefined, offset: number): Node | undefined {
		if (node) {
			const child = this._getDeepestChildAtPosition(node.getChildAtPos(offset), offset);
			if (child) {
				return child;
			} else {
				return node;
			}
		}
	}
}
