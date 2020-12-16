import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSHoverProvider } from "../providers/JSHoverProvider";
import { XMLHoverProvider } from "../providers/XMLHoverProvider";

export class HoverRegistrator {
	static register() {
		let disposable = vscode.languages.registerHoverProvider("javascript", {
			provideHover(document, position) {
				return JSHoverProvider.getTextEdits(document, position);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.languages.registerHoverProvider("xml", {
			provideHover(document, position) {
				return XMLHoverProvider.getTextEdits(document, position);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}
}