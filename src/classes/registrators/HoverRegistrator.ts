import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { HoverProvider } from "../providers/HoverProvider";

export class HoverRegistrator {
	static register() {
		const disposable = vscode.languages.registerHoverProvider("javascript", {
			provideHover(document, position) {
				return HoverProvider.getTextEdits(document, position);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}
}