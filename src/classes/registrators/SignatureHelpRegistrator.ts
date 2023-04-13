import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { SignatureHelpProvider } from "../providers/SignatureHelpProvider";

export class SignatureHelpRegistrator {
	static async register() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("signatureHelp")) {
			const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider(
				{ language: "javascript", scheme: "file" },
				{
					provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
						const parser = ParserPool.getParserForFile(document.fileName);
						if (parser && parser instanceof UI5JSParser) {
							return new SignatureHelpProvider(parser).getSignature(document, position);
						}
					}
				}
			);
			UI5Plugin.getInstance().addDisposable(signatureHelpProvider);
		}
	}
}
