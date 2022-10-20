import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSRenameProvider } from "../providers/rename/JSRenameProvider";
import { TSRenameProvider } from "../providers/rename/TSRenameProvider";

export class JSRenameRegistrator {
	static register() {
		const disposable = vscode.languages.registerRenameProvider({ language: "javascript", scheme: "file" }, {
			provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
				return JSRenameProvider.provideRenameEdits(document, position, newName);
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
	static registerTS() {
		const disposable = vscode.languages.registerRenameProvider({ language: "typescript", scheme: "file" }, {
			provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
				return TSRenameProvider.provideRenameEdits(document, position, newName);
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
