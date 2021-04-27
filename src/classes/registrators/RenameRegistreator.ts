import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSRenameProvider } from "../providers/rename/JSRenameProvider";

export class JSRenameRegistrator {
	static register() {
		const disposable = vscode.languages.registerRenameProvider({ language: "javascript", scheme: "file" }, {
			provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
				return JSRenameProvider.provideRenameEdits(document, position, newName);
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
