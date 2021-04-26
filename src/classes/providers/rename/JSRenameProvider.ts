import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";
import LineColumn = require("line-column");

export class JSRenameProvider {
	static async provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
		const workspaceEdit = new vscode.WorkspaceEdit();

		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			UIClassFactory.setNewCodeForClass(className, document.getText());
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const offset = document.offsetAt(position);
			const memberInClassBody = UIClass.acornClassBody?.properties.find((property: any) => {
				return property.key.start <= offset && property.key.end >= offset;
			});

			if (memberInClassBody) {
				const methodOrField =
					UIClass.methods.find(method => method.name === memberInClassBody.key.name) ||
					UIClass.fields.find(field => field.name === memberInClassBody.key.name);
				if (methodOrField) {
					this._addTextEditsForMembersInClassBodyRename(className, methodOrField.name, newName, workspaceEdit, document);
				}
			} else {
				const methodOrField =
					UIClass.methods.find(method => method.acornNode?.start <= offset && method.acornNode?.end >= offset) ||
					UIClass.fields.find(field => field.acornNode?.start <= offset && field.acornNode?.end >= offset);
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

								this._addTextEditsForMembersInClassBodyRename(classNameOfTheCurrentMethod, oldMethodName, newName, workspaceEdit, document);
							}
						}
					}
				}
			}
		}

		return workspaceEdit.size > 0 ? workspaceEdit : null;
	}

	private static _addTextEditsForMembersInClassBodyRename(className: string, oldMemberName: string, newMemberName: string, workspaceEdit: vscode.WorkspaceEdit, document: vscode.TextDocument) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const methodOrField = UIClass.methods.find(method => method.name === oldMemberName) || UIClass.fields.find(field => field.name === oldMemberName);
		if (methodOrField?.acornNode) {
			const acornPropertyNode = UIClass.acornClassBody?.properties.find((property: any) => {
				return methodOrField.acornNode && (property.value === methodOrField.acornNode || property.value === methodOrField.acornNode?.value);
			});

			if (acornPropertyNode) {
				const positionBegin = document.positionAt(acornPropertyNode.key.start);
				const positionEnd = document.positionAt(acornPropertyNode.key.end);
				const range = new vscode.Range(positionBegin, positionEnd);
				workspaceEdit.replace(document.uri, range, newMemberName);

			}

			this._addTextEditsForMemberRename(className, oldMemberName, newMemberName, workspaceEdit);
		}
	}

	private static _addTextEditsForMemberRename(className: string, oldMemberName: string, newMemberName: string, workspaceEdit: vscode.WorkspaceEdit) {
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
								const lineColumnStart = LineColumn(UIClass.classText).fromIndex(memberExpression.property.start);
								const lineColumnEnd = LineColumn(UIClass.classText).fromIndex(memberExpression.property.end);
								if (lineColumnStart && lineColumnEnd) {
									const positionStart = new vscode.Position(lineColumnStart.line - 1, lineColumnStart.col - 1);
									const positionEnd = new vscode.Position(lineColumnEnd.line - 1, lineColumnEnd.col - 1);
									workspaceEdit.replace(classUri, new vscode.Range(positionStart, positionEnd), newMemberName);
								}
							}
						});
					}
				});
			}
		});
	}
}