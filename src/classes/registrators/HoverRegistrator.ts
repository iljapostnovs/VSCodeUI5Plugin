import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSHoverProvider } from "../providers/hover/js/JSHoverProvider";
import { XMLHoverProvider } from "../providers/hover/xml/XMLHoverProvider";

export class HoverRegistrator {
	static register() {
		let disposable = vscode.languages.registerHoverProvider("javascript", {
			provideHover(document, position) {
				const parser = ParserPool.getParserForFile(document.fileName);
				if (parser && parser instanceof UI5JSParser) {
					return new JSHoverProvider(parser).getTextEdits(document, position);
				}
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.languages.registerHoverProvider("xml", {
			provideHover(document, position) {
				const parser = ParserPool.getParserForFile(document.fileName);
				if (parser) {
					return new XMLHoverProvider(parser).getHovers(document, position);
				}
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
