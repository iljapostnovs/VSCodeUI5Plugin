import * as vscode from "vscode";
import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassDefinitionFinder } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassDefinitionFinder";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { UIMethod } from "../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";

export class SignatureHelpRegistrator {
	static async register(context: vscode.ExtensionContext) {
		const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider({language: "javascript", scheme: "file"}, {
			provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {
				const signatureHelp = new vscode.SignatureHelp();

				const currentVariable = SyntaxAnalyzer.getCurrentActiveText();
				const currentMethodParts = currentVariable.split(".");
				const currentMethodText = currentMethodParts[currentMethodParts.length - 1];
				currentMethodParts.splice(currentMethodParts.length - 1, 1);
				const variableToGetClassFrom = currentMethodParts.join(".");
				const variableClass = UIClassDefinitionFinder.getVariableClass(variableToGetClassFrom);

				if (variableClass) {

					const UIClass = UIClassFactory.getUIClass(variableClass);
					const currentMethod: UIMethod | undefined = UIClass.methods.find(method => method.name === currentMethodText);
					if (currentMethod && currentMethod.params.length > 0) {
						signatureHelp.activeParameter = 0;
						// signatureHelp.activeSignature = 0;
						const signature = new vscode.SignatureInformation(currentMethodText);
						signature.parameters = currentMethod.params.map(param => {
							return new vscode.ParameterInformation(param, param);
						});

						signatureHelp.signatures = [signature];


						return signatureHelp;
					}
				}
			}
		});

		context.subscriptions.push(signatureHelpProvider);
	}
}