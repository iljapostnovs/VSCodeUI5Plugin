import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";
import { XMLParser } from "../../utils/XMLParser";
import { Util } from "../../utils/Util";

interface IWorkspaceEdit {
	uri: vscode.Uri;
	range: vscode.Range;
	newValue: string;
}
export class JSRenameProvider {
	static async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		let workspaceEdits: IWorkspaceEdit[] = [];

		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			UIClassFactory.setNewContentForClassUsingDocument(document);
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
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
						const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
						const classNameOfTheCurrentMethod = strategy.acornGetClassName(className, offset, true);
						const isThisClassFromAProject = classNameOfTheCurrentMethod && !!FileReader.getManifestForClass(classNameOfTheCurrentMethod);
						if (classNameOfTheCurrentMethod && isThisClassFromAProject) {
							const UIClass = <CustomUIClass>UIClassFactory.getUIClass(classNameOfTheCurrentMethod);
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
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
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
		const UIClasses = UIClassFactory.getAllExistentUIClasses();
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		Object.keys(UIClasses).forEach(key => {
			const UIClass = UIClasses[key];
			if (UIClass instanceof CustomUIClass) {
				UIClass.methods.forEach(method => {
					if (method.acornNode) {
						const memberExpressions = AcornSyntaxAnalyzer.expandAllContent(method.acornNode).filter((node: any) => node.type === "MemberExpression");
						const neededMemberExpressions = memberExpressions.filter((memberExpression: any) => memberExpression.property?.name === oldMemberName);
						neededMemberExpressions.forEach((memberExpression: any) => {
							const memberExpressionClassName = strategy.acornGetClassName(UIClass.className, memberExpression.property.start, true);
							if (memberExpressionClassName === className && UIClass.classFSPath) {
								const classUri = vscode.Uri.file(UIClass.classFSPath);
								const range = Util.positionsToVSCodeRange(UIClass.classText, memberExpression.property.start, memberExpression.property.end);
								if (range) {
									workspaceEdits.push({
										uri: classUri,
										range: range,
										newValue: newMemberName
									});
								}
							}
						});
					}
				});
			}
		});
	}

	private static _addTextEditsForEventHandlersInXMLDocs(className: string, oldMemberName: string, newMemberName: string, workspaceEdits: IWorkspaceEdit[]) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const methodOrField =
			UIClass.methods.find(method => method.name === oldMemberName) ||
			UIClass.fields.find(field => field.name === oldMemberName);
		if (methodOrField?.mentionedInTheXMLDocument) {
			const viewsAndFragments = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, true, true);
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
						const range = Util.positionsToVSCodeRange(viewOrFragment.content, positionOfEventHandlerInAttributeValueBegin, positionOfEventHandlerInAttributeValueEnd);
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