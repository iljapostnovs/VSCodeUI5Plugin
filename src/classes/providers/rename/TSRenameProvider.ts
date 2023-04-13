import { ICustomTSField, ICustomTSMethod, UI5TSParser } from "ui5plugin-parser";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSObject";
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
	async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		let workspaceEdits: IWorkspaceEdit[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
				const offset = document.offsetAt(position);
				const members = [...UIClass.methods, ...UIClass.fields];
				const methodOrField = members.find(method => {
					return (
						method.node &&
						method.node.getNameNode().getStart() <= offset &&
						method.node.getNameNode().getEnd() >= offset
					);
				});

				if (methodOrField?.node) {
					const renameLocations =
						this._parser
							.getProject(document.uri.fsPath)
							?.getLanguageService()
							.findRenameLocations(methodOrField.node) ?? [];

					const wsEdits = renameLocations.map(renameLocation => {
						const renameStart = renameLocation.getTextSpan().getStart();
						const renameEnd = renameLocation.getTextSpan().getEnd();
						const range = RangeAdapter.tsOffsetsToVSCodeRange(
							renameStart,
							renameEnd,
							renameLocation.getSourceFile()
						);

						const wsEdit: IWorkspaceEdit = {
							uri: vscode.Uri.file(renameLocation.compilerObject.fileName),
							newValue: newName,
							range: range
						};

						return wsEdit;
					});

					workspaceEdits.push(...wsEdits);

					this._addTextEditsForEventHandlersInXMLDocs(className, methodOrField.name, newName, workspaceEdits);
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

	private _addTextEditsForEventHandlersInXMLDocs(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
			const fields: ICustomTSField[] = UIClass.fields;
			const methods: ICustomTSMethod[] = UIClass.methods;
			const methodOrField =
				methods.find(method => method.name === oldMemberName) ??
				fields.find(field => field.name === oldMemberName);

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
}
