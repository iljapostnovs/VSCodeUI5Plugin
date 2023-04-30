import { AxiosRequestConfig } from "axios";
import { HTTPHandler } from "ui5plugin-parser/dist/classes/http/HTTPHandler";
import * as vscode from "vscode";
import { IXMLSourcePrompt, TSODataInterfacesFetchingData } from "./IXMLSourcePrompt";

export class XMLSourcePrompt implements IXMLSourcePrompt {
	async getXMLMetadataText() {
		let XMLMetadata = "";
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument && activeDocument.fileName.endsWith("metadata.xml")) {
			XMLMetadata = activeDocument.getText();
		} else {
			const config = vscode.workspace
				.getConfiguration("ui5.plugin")
				.get<TSODataInterfacesFetchingData | undefined>("TSODataInterfacesFetchingData");

			let url: string | undefined;
			let username: string | undefined;
			let password: string | undefined;

			if (config?.url) {
				url = config.url;
				username = config.username;
				password = config.password;
			} else {
				url = await vscode.window.showInputBox({
					prompt: "Please define url to metadata"
				});
				username = await vscode.window.showInputBox({
					prompt: "Please enter username"
				});
				password = await vscode.window.showInputBox({
					prompt: "Please enter password",
					password: true
				});
			}

			if (url) {
				const config: AxiosRequestConfig = {};
				if (username && password) {
					config.auth = { username, password };
				}
				XMLMetadata = await HTTPHandler.get(url, config);
			}
		}

		return [XMLMetadata];
	}
}
