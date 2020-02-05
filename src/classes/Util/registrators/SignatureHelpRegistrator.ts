import * as vscode from "vscode";
// import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";

export class SignatureHelpRegistrator {
	static async register(context: vscode.ExtensionContext) {
		// const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider({language: "javascript", scheme: "file"}, {
		// 	provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {
		// 		const signatureHelp = new vscode.SignatureHelp();

		// 		const currentVariable = SyntaxAnalyzer.getCurrentActiveText();

		// 		signatureHelp.activeParameter = 0;
		// 		signatureHelp.activeSignature = 0;
		// 		const signature = new vscode.SignatureInformation('param', 'great param');
		// 		signature.parameters = [new vscode.ParameterInformation('x', 'docs')];

		// 		signatureHelp.signatures = [signature];


		// 		return signatureHelp;
		// 	}
		// });

		// context.subscriptions.push(signatureHelpProvider);
	}
}