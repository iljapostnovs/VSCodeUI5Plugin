import * as vscode from "vscode";
import * as path from "path";
import { CustomUIClass } from "../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RootNode } from "../../../abstraction/RootNode";

export class MethodsNode extends RootNode {
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = `Methods (${UIClass.methods.length})`;
		this.iconPath = path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "..", "..", "icons", "symbol-method.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}