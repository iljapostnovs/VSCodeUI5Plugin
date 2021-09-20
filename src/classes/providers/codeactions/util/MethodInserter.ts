import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { CodeGeneratorFactory } from "../../../templateinserters/codegenerationstrategies/CodeGeneratorFactory";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";

export enum InsertType {
	Method = "Method",
	Field = "Field"
}
export class MethodInserter {
	static createInsertMethodCodeAction(className: string, memberName: string, params: string, body: string, type: InsertType, tabsToAdd = "\t\t") {
		let insertMethodCodeAction: vscode.CodeAction | undefined;
		const classPath = FileReader.getClassFSPathFromClassName(className);
		if (classPath) {
			const classUri = vscode.Uri.file(classPath);
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			let insertContent = "";
			if (type === InsertType.Method) {
				insertContent = CodeGeneratorFactory.createStrategy().generateFunction(memberName, params, body, tabsToAdd);
			} else {
				insertContent = `${memberName}: ${this._getInsertContentFromIdentifierName(memberName)}`;
			}
			const { offset, insertText } = this._getInsertTextAndOffset(insertContent, className);

			const position = PositionAdapter.offsetToPosition(UIClass.classText, offset);

			if (position) {
				insertMethodCodeAction = new vscode.CodeAction(`Create "${memberName}" in "${className}" class`, vscode.CodeActionKind.QuickFix);
				insertMethodCodeAction.isPreferred = true;
				insertMethodCodeAction.edit = new vscode.WorkspaceEdit();
				insertMethodCodeAction.edit.insert(classUri, position, insertText);
				insertMethodCodeAction.command = {
					command: "vscode.open",
					title: "Open file",
					arguments: [classUri, {
						selection: new vscode.Range(
							position.line + 3, 3,
							position.line + 3, 3
						)
					}]
				};
			}
		}

		return insertMethodCodeAction;
	}

	private static _getInsertContentFromIdentifierName(name: string) {
		let content = "";

		const type = CustomUIClass.getTypeFromHungarianNotation(name)?.toLowerCase();
		switch (type) {
			case "object":
				content = "{}";
				break;
			case "array":
				content = "[]";
				break;
			case "int":
				content = "0";
				break;
			case "float":
				content = "0";
				break;
			case "number":
				content = "0";
				break;
			case "map":
				content = "{}";
				break;
			case "string":
				content = "\"\"";
				break;
			case "boolean":
				content = "true";
				break;
			case "any":
				content = "null";
				break;
			default:
				content = "null";
		}

		return content;
	}

	private static _getInsertTextAndOffset(insertContent: string, className: string) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		let offset = 0;
		const classIsCurrentlyOpened = this._checkIfClassIsCurrentlyOpened(className);
		const thereAreNoMethods = UIClass.acornClassBody.properties.length === 0;

		let insertText = `\n\t\t${insertContent}`;

		if (classIsCurrentlyOpened && vscode.window.activeTextEditor) {
			const currentSelection = vscode.window.activeTextEditor.selection.start;
			const currentPosition = vscode.window.activeTextEditor.document.offsetAt(currentSelection);
			if (currentPosition) {
				const currentMethod = UIClass.methods.find(method => method.acornNode?.start < currentPosition && method.acornNode?.end > currentPosition);
				if (currentMethod) {
					offset = currentMethod.acornNode.end;
					const currentMethodIsLastMethod = ReusableMethods.getIfMethodIsLastOne(UIClass, currentMethod);

					if (!thereAreNoMethods) {
						insertText = `\n${insertText}`;
					}

					if (!currentMethodIsLastMethod) {
						insertText += ","
						offset++;
					} else {
						insertText = `,${insertText}`;
					}
				}
			}
		} else {
			const lastMethod = UIClass.acornClassBody.properties[UIClass.acornClassBody.properties.length - 1];
			if (lastMethod || thereAreNoMethods) {
				offset = lastMethod?.end || UIClass.acornClassBody.start;
			}

			if (!thereAreNoMethods) {
				insertText = `,\n${insertText}`;
			}
		}

		return { insertText, offset };
	}

	private static _checkIfClassIsCurrentlyOpened(className: string) {
		let classIsCurrentlyOpened = false;

		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && currentDocument.fileName.endsWith(".js")) {
			const currentClassName = FileReader.getClassNameFromPath(currentDocument.fileName);
			if (currentClassName) {
				classIsCurrentlyOpened = className === currentClassName;
			}
		}

		return classIsCurrentlyOpened;
	}
}