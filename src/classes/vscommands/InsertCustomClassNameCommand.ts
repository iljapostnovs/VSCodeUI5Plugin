import * as vscode from "vscode";
import {FileReader} from "../utils/FileReader";
export class InsertCustomClassNameCommand {
	static insertCustomClassName() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const classNameDotNotationToInsert = FileReader.getClassNameFromPath(document.uri.fsPath);
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