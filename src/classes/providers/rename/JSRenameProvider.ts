import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { RangeAdapter } from "../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../ui5parser/ParserBearer";

interface IWorkspaceEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newValue: string;
}
export class JSRenameProvider extends ParserBearer<UI5JSParser> {
	async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		let workspaceEdits: IWorkspaceEdit[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
			const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
			const offset = document.offsetAt(position);
			const members = [...UIClass.methods, ...UIClass.fields];
			const methodOrField = members.find(method => {
				if (method.loc) {
					const range = RangeAdapter.acornLocationToVSCodeRange(method.loc);
					const offsetBegin = document.offsetAt(range.start);
					const offsetEnd = document.offsetAt(range.end);
					return offsetBegin <= offset && offsetEnd >= offset;
				}
			});

			if (methodOrField?.node) {
				this._addTextEditsForMembersInClassBodyRename(
					className,
					methodOrField.name,
					newName,
					workspaceEdits,
					document
				);
			} else {
				const member = members.find(member => member.node?.start <= offset && member.node?.end >= offset);
				if (member) {
					const range = document.getWordRangeAtPosition(position);
					const oldMethodName = range && document.getText(range);
					if (oldMethodName) {
						const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
							this._parser.syntaxAnalyser,
							this._parser
						);
						const classNameOfTheCurrentMethod = strategy.acornGetClassName(className, offset, true);
						const isThisClassFromAProject =
							classNameOfTheCurrentMethod &&
							!!this._parser.fileReader.getManifestForClass(classNameOfTheCurrentMethod);
						if (classNameOfTheCurrentMethod && isThisClassFromAProject) {
							const UIClass = <CustomJSClass>(
								this._parser.classFactory.getUIClass(classNameOfTheCurrentMethod)
							);
							if (UIClass.fsPath) {
								const uri = vscode.Uri.file(UIClass.fsPath);
								const document = await vscode.workspace.openTextDocument(uri);

								this._addTextEditsForMembersInClassBodyRename(
									classNameOfTheCurrentMethod,
									oldMethodName,
									newName,
									workspaceEdits,
									document
								);
							}
						}
					}
				}
			}
		}

		workspaceEdits = this._removeOverlapingEdits(workspaceEdits);

		let workspaceEdit: vscode.WorkspaceEdit | undefined = new vscode.WorkspaceEdit();
		if (workspaceEdits.length > 0) {
			workspaceEdits.forEach(workspaceEditEntry => {
				workspaceEdit?.replace(workspaceEditEntry.uri, workspaceEditEntry.range, workspaceEditEntry.newValue);
			});
		} else {
			workspaceEdit = undefined;
		}

		return workspaceEdit;
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

	private _addTextEditsForMembersInClassBodyRename(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[],
		document: vscode.TextDocument
	) {
		const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
		const member =
			UIClass.methods.find(method => method.name === oldMemberName) ||
			UIClass.fields.find(field => field.name === oldMemberName);
		if (member?.node && member.loc) {
			const range = RangeAdapter.acornLocationToVSCodeRange(member.loc);
			workspaceEdits.push({
				uri: document.uri,
				range: range,
				newValue: newMemberName
			});

			this._addTextEditsForMemberRename(className, oldMemberName, newMemberName, workspaceEdits);
			this._addTextEditsForEventHandlersInXMLDocs(className, oldMemberName, newMemberName, workspaceEdits);
		}
	}

	private _addTextEditsForMemberRename(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		const UIClasses = ParserPool.getAllExistentUIClasses();
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser, this._parser);
		Object.keys(UIClasses).forEach(key => {
			const UIClass = UIClasses[key];
			if (UIClass instanceof CustomJSClass) {
				UIClass.methods.forEach(method => {
					if (method.node) {
						const memberExpressions = this._parser.syntaxAnalyser
							.expandAllContent(method.node)
							.filter((node: any) => node.type === "MemberExpression");
						const neededMemberExpressions = memberExpressions.filter(
							(memberExpression: any) => memberExpression.property?.name === oldMemberName
						);
						neededMemberExpressions.forEach((memberExpression: any) => {
							const memberExpressionClassName = strategy.acornGetClassName(
								UIClass.className,
								memberExpression.property.start,
								true
							);
							if (memberExpressionClassName === className && UIClass.fsPath) {
								const classUri = vscode.Uri.file(UIClass.fsPath);
								const range = RangeAdapter.acornLocationToVSCodeRange(memberExpression.property.loc);
								workspaceEdits.push({
									uri: classUri,
									range: range,
									newValue: newMemberName
								});
							}
						});
					}
				});
			}
		});
	}

	private _addTextEditsForEventHandlersInXMLDocs(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
		const methodOrField =
			UIClass.methods.find(method => method.name === oldMemberName) ||
			UIClass.fields.find(field => field.name === oldMemberName);
		if (methodOrField?.mentionedInTheXMLDocument) {
			const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
				UIClass,
				[],
				true,
				true,
				true
			);
			const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
			viewAndFragmentArray.forEach(viewOrFragment => {
				const tagsAndAttributes = this._parser.xmlParser.getXMLFunctionCallTagsAndAttributes(
					viewOrFragment,
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
						const classUri = vscode.Uri.file(viewOrFragment.fsPath);
						const range = RangeAdapter.offsetsToVSCodeRange(
							viewOrFragment.content,
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
			});
		}
	}
}
