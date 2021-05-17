import axios, { AxiosRequestConfig } from "axios";
import * as https from "https";
import * as url from "url";
import * as vscode from "vscode";
export class HTTPHandler {
	static async get(uri: string) {
		let data = {};

		const rejectUnauthorized = vscode.workspace.getConfiguration("ui5.plugin").get("rejectUnauthorized");
		const agent = new https.Agent({
			rejectUnauthorized: !!rejectUnauthorized
		});
		const options: AxiosRequestConfig = {
			httpsAgent: agent
		};
		const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
		if (proxy) {
			const parsedProxy = new url.URL(proxy);
			if (parsedProxy.hostname) {
				const port = this._getPort(parsedProxy);
				options.proxy = {
					host: parsedProxy.hostname,
					port: port,
					protocol: parsedProxy.protocol || undefined
				};
			}
		}

		try {
			data = (await axios.get(uri, options)).data;
		} catch (error) {
			vscode.window.showErrorMessage(`Error occured sending HTTP Request. Message: "${error.message}". Response data: "${error.response?.data}"`);
			throw error;
		}

		return data;
	}

	private static _getPort(uri: url.URL) {
		let port;

		if (uri.port) {
			port = parseInt(uri.port);
		} else if (uri.protocol === "http:") {
			port = 80;
		} else if (uri.protocol === "https:") {
			port = 443;
		} else {
			port = 80;
		}

		return port;
	}
}