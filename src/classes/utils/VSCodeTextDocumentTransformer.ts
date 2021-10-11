import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
export class VSCodeTextDocumentTransformer {
	static toXMLFile(document: vscode.TextDocument, forceRefresh = false) {
		return TextDocumentTransformer.toXMLFile(new TextDocumentAdapter(document), forceRefresh);
	}

	static toUIClass(document: vscode.TextDocument) {
		return TextDocumentTransformer.toUIClass(new TextDocumentAdapter(document));
	}

	static toCustomUIClass(document: vscode.TextDocument) {
		return TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
	}
}