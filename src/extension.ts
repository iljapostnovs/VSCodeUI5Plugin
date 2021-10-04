
import * as vscode from "vscode";
import { UI5Plugin } from "./UI5Plugin";

export async function activate(context: vscode.ExtensionContext) {
	await UI5Plugin.getInstance().initialize(context);
}