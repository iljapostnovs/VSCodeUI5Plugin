import * as vscode from "vscode";
import { SignatureHelpProvider } from "../providers/SignatureHelpProvider";

export class SignatureHelpRegistrator {
	static async register(context: vscode.ExtensionContext) {
		const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider({language: "javascript", scheme: "file"}, {
			provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {
				return SignatureHelpProvider.getSignature();
			}
		});

		context.subscriptions.push(signatureHelpProvider);
	}
}