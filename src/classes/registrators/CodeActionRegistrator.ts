import { UI5JSParser } from "ui5plugin-parser";
import ParserPool from "ui5plugin-parser/dist/parser/pool/ParserPool";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSCodeActionProvider } from "../providers/codeactions/js/JSCodeActionProvider";
import { XMLCodeActionProvider } from "../providers/codeactions/xml/XMLCodeActionProvider";

export class CodeActionRegistrator {
	static register() {
		let disposable = vscode.languages.registerCodeActionsProvider(
			{ language: "javascript", scheme: "file" },
			{
				provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5JSParser) {
						return parser && new JSCodeActionProvider(parser).getCodeActions(document, range);
					}
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.languages.registerCodeActionsProvider(
			{ language: "xml", scheme: "file" },
			{
				provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
					const parser = ParserPool.getParserForFile(document.fileName);
					return parser && new XMLCodeActionProvider(parser).getCodeActions(document, range);
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);
	}

	static registerTS() {
		const disposable = vscode.languages.registerCodeActionsProvider(
			{ language: "xml", scheme: "file" },
			{
				provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
					const parser = ParserPool.getParserForFile(document.fileName);
					return parser && new XMLCodeActionProvider(parser).getCodeActions(document, range);
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
