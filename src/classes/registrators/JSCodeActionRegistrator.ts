import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { CodeActionProvider } from "../providers/CodeActionProvider";

export class JSCodeActionRegistrator {
	static register() {
		const disposable = vscode.languages.registerCodeActionsProvider({language: "javascript", scheme: "file"}, {
			provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {
				return CodeActionProvider.getCodeActions(document, range);
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
