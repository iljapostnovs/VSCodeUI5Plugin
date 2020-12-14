import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { XMLFormatter } from "../utils/XMLFormatter";
export class XMLFormatterRegistrator {
	static register() {
		const disposable = vscode.languages.registerDocumentFormattingEditProvider({ language: "xml" }, {
			provideDocumentFormattingEdits: (document, options) => {
				return XMLFormatter.formatDocument(document);
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}