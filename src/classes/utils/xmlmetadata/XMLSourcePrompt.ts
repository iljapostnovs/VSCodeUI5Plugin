
import { AxiosRequestConfig } from "axios";
import { HTTPHandler } from "ui5plugin-parser/dist/classes/utils/HTTPHandler";
import * as vscode from "vscode";
export class XMLSourcePrompt {
	async getXMLMetadataText() {
		let XMLMetadata = "";
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument && activeDocument.fileName.endsWith("metadata.xml")) {
			XMLMetadata = activeDocument.getText();
		} else {
			const uri = await vscode.window.showInputBox({
				prompt: "Please define url to metadata"
			});
			const username = await vscode.window.showInputBox({
				prompt: "Please enter username"
			});
			const password = await vscode.window.showInputBox({
				prompt: "Please enter password",
				password: true
			});

			if (uri) {
				const config: AxiosRequestConfig<any> = {};
				if (username && password) {
					config.auth = { username, password };
				}
				XMLMetadata = await HTTPHandler.get(uri, config);
			}
		}

		return XMLMetadata;
	}
}