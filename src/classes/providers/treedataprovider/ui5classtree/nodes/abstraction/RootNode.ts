import * as vscode from "vscode";
import * as path from "path";
import { Node } from "./Node";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
export abstract class RootNode extends Node {
	readonly UIClass: AbstractCustomClass;
	constructor(UIClass: AbstractCustomClass, parser: IUI5Parser) {
		super(parser);
		this.UIClass = UIClass;
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = vscode.extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}