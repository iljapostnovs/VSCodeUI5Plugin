import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";
import LineColumn = require("line-column");

export class JSRenameProvider {
	static provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const workspaceEdit = new vscode.WorkspaceEdit();

		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			UIClassFactory.setNewCodeForClass(className, document.getText());
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const offset = document.offsetAt(position);
			const methods = UIClass.methods;
			const memberInClassBody = UIClass.acornClassBody?.properties.find((property: any) => {
				return property.key.start <= offset && property.key.end >= offset;
			});

			if (memberInClassBody) {
				const method = methods.find(method => method.name === memberInClassBody.key.name);
				if (method) {
					this._addTextEditsForMethodsInClassBodyRename(className, method.name, newName, workspaceEdit, document);
				}
			}
		}
		// workspaceEdit.replace
		return workspaceEdit;
	}

	private static _addTextEditsForMethodsInClassBodyRename(className: string, oldMethodName: string, newMethodName: string, workspaceEdit: vscode.WorkspaceEdit, document: vscode.TextDocument) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const method = UIClass.methods.find(method => method.name === oldMethodName);
		if (method?.acornNode) {
			const acornPropertyNode = UIClass.acornClassBody?.properties.find((property: any) => {
				return property.value === method.acornNode;
			});

			if (acornPropertyNode) {
				const positionBegin = document.positionAt(acornPropertyNode.key.start);
				const positionEnd = document.positionAt(acornPropertyNode.key.end);
				const range = new vscode.Range(positionBegin, positionEnd);
				workspaceEdit.replace(document.uri, range, newMethodName);

				this._addTextEditsForMemberRename(className, oldMethodName, newMethodName, workspaceEdit);
			}
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