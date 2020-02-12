import * as vscode from "vscode";
import {XMLCodeLensProvider} from "../XMLCodeLensProvider";

export class XMLResourceModelCodeLensRegistrator {
	static register(context: vscode.ExtensionContext) {
		const XMLCodeLens = vscode.languages.registerCodeLensProvider({language: "xml", scheme: "file"}, {
			provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken) {
				return XMLCodeLensProvider.getCodeLenses(document);
			}
		});

		vscode.commands.registerCommand("ui5plugin.gotoresourcemodel", i18nId => {
			if (i18nId) {
				XMLCodeLensProvider.goToResourceModel(i18nId[0]);
			}
		});

		context.subscriptions.push(XMLCodeLens);
	}
}