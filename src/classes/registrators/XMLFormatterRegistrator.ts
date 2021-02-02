import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { XMLFormatter } from "../utils/XMLFormatter";
export class XMLFormatterRegistrator {
	static register() {
		const disposable = vscode.languages.registerDocumentFormattingEditProvider({ language: "xml" }, {
			provideDocumentFormattingEdits: (document) => {
				if (document.uri.fsPath.endsWith(".view.xml") || document.uri.fsPath.endsWith(".fragment.xml")) {
					return XMLFormatter.formatDocument(document);
				} else {
					vscode.window.showInformationMessage("UI5 XML formatter works only for views and fragments");
				}
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}