import * as vscode from "vscode";
import {SignatureHelpProvider} from "../providers/SignatureHelpProvider";
import {UI5Plugin} from "../../UI5Plugin";

export class SignatureHelpRegistrator {
	static async register() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("signatureHelp")) {
			const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider({language: "javascript", scheme: "file"}, {
				provideSignatureHelp(document: vscode.TextDocument) {
					return SignatureHelpProvider.getSignature(document);
				}
			});
			UI5Plugin.getInstance().addDisposable(signatureHelpProvider);
		}
	}
}