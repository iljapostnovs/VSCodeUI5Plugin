import { RootNode } from "../../abstraction/RootNode";
import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as path from "path";

export class MethodsNode extends RootNode {
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = `Methods (${UIClass.methods.length})`;
		this.iconPath = path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "..", "icons", "symbol-method.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}