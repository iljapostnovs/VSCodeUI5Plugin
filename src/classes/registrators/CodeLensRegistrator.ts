import { ParserPool, UI5JSParser, UI5TSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSCodeLensProvider } from "../providers/codelens/jscodelens/JSCodeLensProvider";
import { TSCodeLensProvider } from "../providers/codelens/jscodelens/TSCodeLensProvider";
import { XMLCodeLensProvider } from "../providers/codelens/xmlcodelens/XMLCodeLensProvider";
import { ReusableMethods } from "../providers/reuse/ReusableMethods";

export class CodeLensRegistrator {
	static register() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("xmlCodeLens")) {
			const XMLCodeLens = vscode.languages.registerCodeLensProvider(
				{ language: "xml", scheme: "file" },
				{
					provideCodeLenses(document: vscode.TextDocument) {
						const parser = ParserPool.getParserForFile(document.fileName);
						return parser && new XMLCodeLensProvider(parser).getCodeLenses(document);
					}
				}
			);

			const vscodeCommand = vscode.commands.registerCommand("ui5plugin.gotoresourcemodel", i18nId => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (i18nId && parser) {
					new XMLCodeLensProvider(parser).goToResourceModel(i18nId[0]);
				}
			});
			UI5Plugin.getInstance().addDisposable(XMLCodeLens);
			UI5Plugin.getInstance().addDisposable(vscodeCommand);
		}

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsCodeLens")) {
			const JSCodeLens = vscode.languages.registerCodeLensProvider(
				{ language: "javascript", scheme: "file" },
				{
					provideCodeLenses(document: vscode.TextDocument) {
						const parser = ParserPool.getParserForFile(document.fileName);
						if (parser && parser instanceof UI5JSParser) {
							return new JSCodeLensProvider(parser).getCodeLenses(document);
						}
					}
				}
			);
			UI5Plugin.getInstance().addDisposable(JSCodeLens);
			const TSCodeLens = vscode.languages.registerCodeLensProvider(
				{ language: "typescript", scheme: "file" },
				{
					provideCodeLenses(document: vscode.TextDocument) {
						const parser = ParserPool.getParserForFile(document.fileName);
						if (parser && parser instanceof UI5TSParser) {
							return new TSCodeLensProvider(parser).getCodeLenses(document);
						}
					}
				}
			);
			UI5Plugin.getInstance().addDisposable(TSCodeLens);
		}
	}
}
