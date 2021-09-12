import { UI5Parser, WorkspaceFolder } from "ui5plugin-parser";
import { VSCodeConfigHandler } from "./classes/ui5parser/VSCodeConfigHandler";
const parser = UI5Parser.getInstance({
	configHandler: new VSCodeConfigHandler()
});
import * as vscode from "vscode";
import { UI5Plugin } from "./UI5Plugin";

export async function activate(context: vscode.ExtensionContext) {
	const globalStoragePath = context.globalStorageUri.fsPath;
	const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
		return new WorkspaceFolder(wsFolder.uri.fsPath);
	})
	await parser.initialize(workspaceFolders, globalStoragePath);
	await UI5Plugin.getInstance().initialize();
}