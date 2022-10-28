import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class MethodsNode extends RootNode {
	constructor(UIClass: AbstractCustomClass) {
		super(UIClass);
		this.label = `Methods (${UIClass.methods.length})`;
		this.iconPath = this._buildIconPath("symbol-method.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}