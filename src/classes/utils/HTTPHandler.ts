import axios, { AxiosRequestConfig } from "axios";
import * as https from "https";
import * as vscode from "vscode";
export class HTTPHandler {
	static async get(uri: string, options: AxiosRequestConfig = {}): Promise<any> {
		let data = {};

		const rejectUnauthorized = vscode.workspace.getConfiguration("ui5.plugin").get("rejectUnauthorized");
		const agent = new https.Agent({
			rejectUnauthorized: !!rejectUnauthorized
		});
		options.httpsAgent = agent;

		try {
			data = (await axios.get(uri, options)).data;
		} catch (error) {
			vscode.window.showErrorMessage(`Error occurred sending HTTP Request. Message: "${error.message}". Response data: "${error.response?.data}"`);
			throw error;
		}

		return data;
	}
}