import { ParserPool, UI5JSParser, UI5TSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSRenameProvider } from "../providers/rename/JSRenameProvider";
import { TSRenameProvider } from "../providers/rename/TSRenameProvider";

export class JSRenameRegistrator {
	static register() {
		let disposable = vscode.languages.registerRenameProvider(
			{ language: "javascript", scheme: "file" },
			{
				provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5JSParser) {
						return new JSRenameProvider(parser).provideRenameEdits(document, position, newName);
					}
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.languages.registerRenameProvider(
			{ language: "typescript", scheme: "file" },
			{
				provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5TSParser) {
						return new TSRenameProvider(parser).provideRenameEdits(document, position, newName);
					}
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
