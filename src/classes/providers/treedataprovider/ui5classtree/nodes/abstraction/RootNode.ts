import * as vscode from "vscode";
import * as path from "path";
import { Node } from "./Node";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
export abstract class RootNode extends Node {
	readonly UIClass: AbstractCustomClass;
	constructor(UIClass: AbstractCustomClass) {
		super();
		this.UIClass = UIClass;
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = vscode.extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}