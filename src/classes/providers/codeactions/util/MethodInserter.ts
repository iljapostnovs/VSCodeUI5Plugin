import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { ReusableMethods } from "../../reuse/ReusableMethods";

export class MethodInserter {
	static createInsertMethodCodeAction(className: string, methodName: string, insertContent: string) {
		let insertMethodCodeAction: vscode.CodeAction | undefined;
		const classPath = FileReader.getClassPathFromClassName(className);
		if (classPath) {
			const classUri = vscode.Uri.file(classPath);
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const { offset, insertText } = this._getInsertTextAndOffset(insertContent, className, methodName);

			const lineColumn = LineColumn(UIClass.classText).fromIndex(offset);

			if (lineColumn) {
				insertMethodCodeAction = new vscode.CodeAction(`Create "${methodName}" in "${className}" class`, vscode.CodeActionKind.QuickFix);
				insertMethodCodeAction.isPreferred = true;
				insertMethodCodeAction.edit = new vscode.WorkspaceEdit();
				const position = new vscode.Position(lineColumn.line - 1, lineColumn.col);
				insertMethodCodeAction.edit.insert(classUri, position, insertText);
				insertMethodCodeAction.command = {
					command: "vscode.open",
					title: "Open file",
					arguments: [classUri, {
						selection: new vscode.Range(
							lineColumn.line + 2, 3,
							lineColumn.line + 2, 3
						)
					}]
				};
			}
		}

		return insertMethodCodeAction;
	}

	private static _getInsertTextAndOffset(insertContent: string, className: string, methodName: string) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		let offset = 0;
		const classIsCurrentlyOpened = this._checkIfClassIsCurrentlyOpened(className);
		const thereAreNoMethods = UIClass.acornClassBody.properties.length === 0;

		let insertText = `\n\t\t${methodName}: ${insertContent}`;

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