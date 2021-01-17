import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
import LineColumn = require("line-column");

export class MethodInserter {
	static createInsertMethodCodeAction(className: string, methodName: string, insertContent: string) {
		let insertMethodCodeAction: vscode.CodeAction | undefined;
		const classPath = FileReader.getClassPathFromClassName(className);
		if (classPath) {
			const classUri = vscode.Uri.file(classPath);
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const thereAreNoMethods = UIClass.acornClassBody.properties.length === 0;
			const lastMethod = UIClass.acornClassBody.properties[UIClass.acornClassBody.properties.length - 1];
			if (lastMethod || thereAreNoMethods) {
				const offset = lastMethod?.end || UIClass.acornClassBody.start;
				const lineColumn = LineColumn(UIClass.classText).fromIndex(offset);

				if (lineColumn) {
					insertMethodCodeAction = new vscode.CodeAction(`Create "${methodName}" in "${className}" class`, vscode.CodeActionKind.QuickFix);
					insertMethodCodeAction.isPreferred = true;
					insertMethodCodeAction.edit = new vscode.WorkspaceEdit();
					const position = new vscode.Position(lineColumn.line - 1, lineColumn.col);
					insertMethodCodeAction.edit.insert(classUri, position, `${thereAreNoMethods ? "" : ",\n"}\n\t\t${methodName}: ${insertContent}`);
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
		}

		return insertMethodCodeAction;
	}
}