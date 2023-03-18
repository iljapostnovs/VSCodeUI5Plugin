import * as vscode from "vscode";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../ui5parser/ParserBearer";
export class VSCodeTextDocumentTransformer extends ParserBearer {
	toXMLFile(document: vscode.TextDocument, forceRefresh = false) {
		return this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document), forceRefresh);
	}

	toUIClass(document: vscode.TextDocument) {
		return this._parser.textDocumentTransformer.toUIClass(new TextDocumentAdapter(document));
	}

	toCustomUIClass(document: vscode.TextDocument) {
		return this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
	}
}
