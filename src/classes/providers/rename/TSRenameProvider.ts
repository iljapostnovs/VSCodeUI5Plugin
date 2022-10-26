import { AbstractUI5Parser, ICustomTSField, ICustomTSMethod, UI5TSParser, XMLParser } from "ui5plugin-parser";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSObject";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { RangeAdapter } from "../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";

interface IWorkspaceEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newValue: string;
}
export class TSRenameProvider {
	static async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		let workspaceEdits: IWorkspaceEdit[] = [];

		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(
				new TextDocumentAdapter(document)
			);
			const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
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
						AbstractUI5Parser.getInstance(UI5TSParser)
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

	private static _removeOverlapingEdits(workspaceEdits: IWorkspaceEdit[]) {
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

	private static _addTextEditsForEventHandlersInXMLDocs(
		className: string,
		oldMemberName: string,
		newMemberName: string,
		workspaceEdits: IWorkspaceEdit[]
	) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
			const fields: ICustomTSField[] = UIClass.fields;
			const methods: ICustomTSMethod[] = UIClass.methods;
			const methodOrField =
				methods.find(method => method.name === oldMemberName) ??
				fields.find(field => field.name === oldMemberName);

			if (methodOrField?.mentionedInTheXMLDocument) {
				const viewsAndFragments =
					UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
						UIClass,
						[],
						true,
						true,
						true
					);
				const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
				viewAndFragmentArray.forEach(viewOrFragment => {
					const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(
						viewOrFragment,
						oldMemberName,
						className
					);

					tagsAndAttributes.forEach(tagAndAttribute => {
						const { tag, attributes } = tagAndAttribute;
						attributes.forEach(attribute => {
							const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
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
