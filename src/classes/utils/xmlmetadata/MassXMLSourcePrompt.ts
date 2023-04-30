import { AxiosRequestConfig } from "axios";
import { HTTPHandler } from "ui5plugin-parser/dist/classes/http/HTTPHandler";
import * as vscode from "vscode";
import { IXMLSourcePrompt, TSODataInterfacesFetchingData } from "./IXMLSourcePrompt";

export interface MassTSODataInterfacesFetchingData extends TSODataInterfacesFetchingData {
	path?: string;
}

type RequiredFields = Pick<MassTSODataInterfacesFetchingData, "path" | "url">;
type OptionalFields = Pick<MassTSODataInterfacesFetchingData, "username" | "password">;
export type ValidatedConfig = Required<RequiredFields> & OptionalFields;
type ReturnType = { metadataText: string; url: string; path: string };

export class MassXMLSourcePrompt implements IXMLSourcePrompt<ReturnType[]> {
	async getXMLMetadataText() {
		const configs = vscode.workspace
			.getConfiguration("ui5.plugin")
			.get<MassTSODataInterfacesFetchingData[] | undefined>("massTSODataInterfacesFetchingData");

		const validatedConfigs = this._validateConfigs(configs);

		const promises: Promise<ReturnType>[] = validatedConfigs.map(async config => {
			const url = config.url;
			const username = config.username;
			const password = config.password;

			const axiosConfig: AxiosRequestConfig = {};
			if (username && password) {
				axiosConfig.auth = { username, password };
			}

			const metadataText = await HTTPHandler.get(url, axiosConfig);

			return { metadataText: metadataText, url: config.url, path: config.path };
		});

		return await Promise.all(promises);
	}

	private _validateConfigs(configs: MassTSODataInterfacesFetchingData[] | undefined): ValidatedConfig[] {
		const configsWithNoUrlExists = configs?.some(config => !config.url);
		const configsWithNoPathExists = configs?.some(config => !config.path);
		const configsAreUndefined = !configs || configs.length === 0;
		if (configsAreUndefined) {
			throw new Error("Please configure 'ui5.plugin.massTSODataInterfacesFetchingData' preference entry.");
		} else if (configsWithNoUrlExists) {
			throw new Error(
				"Some entries in 'ui5.plugin.massTSODataInterfacesFetchingData' preference entry have undefined url. Please define all urls."
			);
		} else if (configsWithNoPathExists) {
			throw new Error(
				"Some entries in 'ui5.plugin.massTSODataInterfacesFetchingData' preference entry have undefined path. Please define all paths."
			);
		} else {
			return configs as ValidatedConfig[];
		}
	}
}
