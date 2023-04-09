import { realpathSync } from "fs";
import { TextDocument } from "ui5plugin-parser";
import * as vscode from "vscode";

export class TextDocumentAdapter extends TextDocument {
	constructor(document: vscode.TextDocument) {
		const fileName = realpathSync.native(document.fileName);
		super(document.getText(), fileName);
	}
}