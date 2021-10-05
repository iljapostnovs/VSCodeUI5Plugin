import { XMLParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { RangeAdapter } from "../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";

interface IWorkspaceEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newValue: string;
}
export class JSRenameProvider {
	static async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		let workspaceEdits: IWorkspaceEdit[] = [];

		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
			const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			const offset = document.offsetAt(position);
			const methodsAndFields = [
				...UIClass.methods,
				...UIClass.fields
			];
			const methodOrField = methodsAndFields.find(method => {
				return method.memberPropertyNode?.start <= offset && method.memberPropertyNode?.end >= offset;
			});

			if (methodOrField?.memberPropertyNode) {
				this._addTextEditsForMembersInClassBodyRename(className, methodOrField.name, newName, workspaceEdits, document);
			} else {
				const methodOrField =
					methodsAndFields.find(member => member.acornNode?.start <= offset && member.acornNode?.end >= offset);
				if (methodOrField) {
					const range = document.getWordRangeAtPosition(position);
					const oldMethodName = range && document.getText(range);
					if (oldMethodName) {
						const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
						const classNameOfTheCurrentMethod = strategy.acornGetClassName(className, offset, true);
						const isThisClassFromAProject = classNameOfTheCurrentMethod && !!UI5Plugin.getInstance().parser.fileReader.getManifestForClass(classNameOfTheCurrentMethod);
						if (classNameOfTheCurrentMethod && isThisClassFromAProject) {
							const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(classNameOfTheCurrentMethod);
							if (UIClass.classFSPath) {
								const uri = vscode.Uri.file(UIClass.classFSPath);
								const document = await vscode.workspace.openTextDocument(uri);

								this._addTextEditsForMembersInClassBodyRename(classNameOfTheCurrentMethod, oldMethodName, newName, workspaceEdits, document);
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
				workspaceEdit?.replace(workspaceEditEntry.uri, workspaceEditEntry.range, workspaceEditEntry.newValue)
			});
		} else {
			workspaceEdit = undefined;
		}

		return workspaceEdit;
	}

	private static _removeOverlapingEdits(workspaceEdits: IWorkspaceEdit[]) {
		return workspaceEdits.reduce((accumulator: IWorkspaceEdit[], workspaceEdit) => {
			const isOverlapingEdit = !!accumulator.find(workspaceEditInAccumulator => {
				return workspaceEditInAccumulator.uri.path === workspaceEdit.uri.path &&
					workspaceEditInAccumulator.range.isEqual(workspaceEdit.range);
			});

			if (!isOverlapingEdit) {
				accumulator.push(workspaceEdit);
			}

			return accumulator;
		}, []);
	}

	private static _addTextEditsForMembersInClassBodyRename(className: string, oldMemberName: string, newMemberName: string, workspaceEdits: IWorkspaceEdit[], document: vscode.TextDocument) {
		const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		const methodOrField =
			UIClass.methods.find(method => method.name === oldMemberName) ||
			UIClass.fields.find(field => field.name === oldMemberName);
		if (methodOrField?.memberPropertyNode) {
			const positionBegin = document.positionAt(methodOrField.memberPropertyNode.start);
			const positionEnd = document.positionAt(methodOrField.memberPropertyNode.end);
			const range = new vscode.Range(positionBegin, positionEnd);
			workspaceEdits.push({
				uri: document.uri,
				range: range,
				newValue: newMemberName
			});

			this._addTextEditsForMemberRename(className, oldMemberName, newMemberName, workspaceEdits);
			this._addTextEditsForEventHandlersInXMLDocs(className, oldMemberName, newMemberName, workspaceEdits);
		}
	}

	private static _addTextEditsForMemberRename(className: string, oldMemberName: string, newMemberName: string, workspaceEdits: IWorkspaceEdit[]) {
		const UIClasses = UI5Plugin.getInstance().parser.classFactory.getAllExistentUIClasses();
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
		Object.keys(UIClasses).forEach(key => {
			const UIClass = UIClasses[key];
			if (UIClass instanceof CustomUIClass) {
				UIClass.methods.forEach(method => {
					if (method.acornNode) {
						const memberExpressions = UI5Plugin.getInstance().parser.syntaxAnalyser.expandAllContent(method.acornNode).filter((node: any) => node.type === "MemberExpression");
						const neededMemberExpressions = memberExpressions.filter((memberExpression: any) => memberExpression.property?.name === oldMemberName);
						neededMemberExpressions.forEach((memberExpression: any) => {
							const memberExpressionClassName = strategy.acornGetClassName(UIClass.className, memberExpression.property.start, true);
							if (memberExpressionClassName === className && UIClass.classFSPath) {
								const classUri = vscode.Uri.file(UIClass.classFSPath);
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

	private static _addTextEditsForEventHandlersInXMLDocs(className: string, oldMemberName: string, newMemberName: string, workspaceEdits: IWorkspaceEdit[]) {
		const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		const methodOrField =
			UIClass.methods.find(method => method.name === oldMemberName) ||
			UIClass.fields.find(field => field.name === oldMemberName);
		if (methodOrField?.mentionedInTheXMLDocument) {
			const viewsAndFragments = UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, true, true);
			const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
			viewAndFragmentArray.forEach(viewOrFragment => {
				const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(viewOrFragment, oldMemberName, className);

				tagsAndAttributes.forEach(tagAndAttribute => {
					const { tag, attributes } = tagAndAttribute;
					attributes.forEach(attribute => {
						const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
						const positionOfAttribute = tag.positionBegin + tag.text.indexOf(attribute);
						const positionOfValueBegin = positionOfAttribute + attribute.indexOf(attributeValue);
						const positionOfEventHandlerInAttributeValueBegin = positionOfValueBegin + attributeValue.indexOf(oldMemberName);
						const positionOfEventHandlerInAttributeValueEnd = positionOfEventHandlerInAttributeValueBegin + oldMemberName.length;
						const classUri = vscode.Uri.file(viewOrFragment.fsPath);
						const range = RangeAdapter.offsetsToVSCodeRange(viewOrFragment.content, positionOfEventHandlerInAttributeValueBegin, positionOfEventHandlerInAttributeValueEnd - 1);
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