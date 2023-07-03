import { TextDocument } from "ui5plugin-parser";
import * as vscode from "vscode";

export class TextDocumentAdapter extends TextDocument {
	vsCodeDocument: vscode.TextDocument;
	constructor(document: vscode.TextDocument) {
		super(document.getText(), document.fileName);
		this.vsCodeDocument = document;
	}
}
