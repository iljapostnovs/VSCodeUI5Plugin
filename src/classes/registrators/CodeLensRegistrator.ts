import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSCodeLensProvider } from "../providers/codelens/jscodelens/JSCodeLensProvider";
import { TSCodeLensProvider } from "../providers/codelens/jscodelens/TSCodeLensProvider";
import { XMLCodeLensProvider } from "../providers/codelens/xmlcodelens/XMLCodeLensProvider";

export class CodeLensRegistrator {
	static register() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("xmlCodeLens")) {
			const XMLCodeLens = vscode.languages.registerCodeLensProvider({ language: "xml", scheme: "file" }, {
				provideCodeLenses(document: vscode.TextDocument) {
					return XMLCodeLensProvider.getCodeLenses(document);
				}
			});

			const vscodeCommand = vscode.commands.registerCommand("ui5plugin.gotoresourcemodel", i18nId => {
				if (i18nId) {
					XMLCodeLensProvider.goToResourceModel(i18nId[0]);
				}
			});
			UI5Plugin.getInstance().addDisposable(XMLCodeLens);
			UI5Plugin.getInstance().addDisposable(vscodeCommand);

		}

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsCodeLens")) {
			const JSCodeLens = vscode.languages.registerCodeLensProvider({ language: "javascript", scheme: "file" }, {
				provideCodeLenses(document: vscode.TextDocument) {
					return JSCodeLensProvider.getCodeLenses(document);
				}
			});

			UI5Plugin.getInstance().addDisposable(JSCodeLens);
		}
	}

	static registerTS() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("xmlCodeLens")) {
			const XMLCodeLens = vscode.languages.registerCodeLensProvider({ language: "xml", scheme: "file" }, {
				provideCodeLenses(document: vscode.TextDocument) {
					return XMLCodeLensProvider.getCodeLenses(document);
				}
			});

			const vscodeCommand = vscode.commands.registerCommand("ui5plugin.gotoresourcemodel", i18nId => {
				if (i18nId) {
					XMLCodeLensProvider.goToResourceModel(i18nId[0]);
				}
			});
			UI5Plugin.getInstance().addDisposable(XMLCodeLens);
			UI5Plugin.getInstance().addDisposable(vscodeCommand);

		}

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsCodeLens")) {
			const TSCodeLens = vscode.languages.registerCodeLensProvider({ language: "typescript", scheme: "file" }, {
				provideCodeLenses(document: vscode.TextDocument) {
					return TSCodeLensProvider.getCodeLenses(document);
				}
			});

			UI5Plugin.getInstance().addDisposable(TSCodeLens);
		}
	}
}