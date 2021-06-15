import * as vscode from "vscode";
import { RootNode } from "./RootNode";
import * as path from "path";
export abstract class Node extends vscode.TreeItem {
	parent: Node | RootNode | null = null;
	constructor() {
		super("");
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = vscode.extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}