import * as vscode from "vscode";
import {XMLCodeLensProvider} from "../providers/XMLCodeLensProvider";
import { JSCodeLensProvider } from "../providers/JSCodeLensProvider";

export class CodeLensRegistrator {
	static register(context: vscode.ExtensionContext) {
		const XMLCodeLens = vscode.languages.registerCodeLensProvider({language: "xml", scheme: "file"}, {
			provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken) {
				return XMLCodeLensProvider.getCodeLenses(document);
			}
		});
		const JSCodeLens = vscode.languages.registerCodeLensProvider({language: "javascript", scheme: "file"}, {
			provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken) {
				return JSCodeLensProvider.getCodeLenses(document);
			}
		});

		const vscodeCommand = vscode.commands.registerCommand("ui5plugin.gotoresourcemodel", i18nId => {
			if (i18nId) {
				XMLCodeLensProvider.goToResourceModel(i18nId[0]);
			}
		});

		context.subscriptions.push(XMLCodeLens);
		context.subscriptions.push(JSCodeLens);
		context.subscriptions.push(vscodeCommand);
	}
}