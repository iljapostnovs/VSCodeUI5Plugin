import * as vscode from "vscode";
import { UI5Plugin } from "./UI5Plugin";
import { FileReader } from "./classes/Util/FileReader";

export async function activate(context: vscode.ExtensionContext) {
	FileReader.globalStoragePath = context.globalStoragePath;
	const manifests = FileReader.getAllManifests();

	if (manifests.length > 0) {
		await (UI5Plugin.getInstance().initialize(context));
	}
}