import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as path from "path";
import { Node } from "./Node";
export abstract class RootNode extends Node {
	readonly UIClass: CustomUIClass;
	constructor(UIClass: CustomUIClass) {
		super();
		this.UIClass = UIClass;
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = vscode.extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}