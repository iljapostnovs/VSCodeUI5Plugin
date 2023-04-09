import { TextDocument } from "ui5plugin-parser";
import * as vscode from "vscode";

export class TextDocumentAdapter extends TextDocument {
	constructor(document: vscode.TextDocument) {
		super(document.getText(), document.fileName);
	}
}