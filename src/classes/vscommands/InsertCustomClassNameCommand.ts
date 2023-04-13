import * as vscode from "vscode";
import ParserBearer from "../ui5parser/ParserBearer";
export class InsertCustomClassNameCommand extends ParserBearer {
	insertCustomClassName() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const classNameDotNotationToInsert = this._parser.fileReader.getClassNameFromPath(document.uri.fsPath);
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
