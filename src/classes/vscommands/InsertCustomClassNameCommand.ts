import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
export class InsertCustomClassNameCommand {
	static insertCustomClassName() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const classNameDotNotationToInsert = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.uri.fsPath);
			if (classNameDotNotationToInsert) {
				editor.edit(editBuilder => {
					if (editor) {
						editBuilder.insert(editor.selection.start, classNameDotNotationToInsert);
					}
				});
			}
		}
	}
}