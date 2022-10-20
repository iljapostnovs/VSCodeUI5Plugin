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
					return JSCodeActionProvider.getCodeActions(document, range);
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.languages.registerCodeActionsProvider(
			{ language: "xml", scheme: "file" },
			{
				provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
					return XMLCodeActionProvider.getCodeActions(document, range);
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
					return XMLCodeActionProvider.getCodeActions(document, range);
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
