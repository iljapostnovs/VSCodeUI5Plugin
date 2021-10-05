import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class ClassNameNode extends RootNode {
	collapsibleState = vscode.TreeItemCollapsibleState.None;
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = UIClass.className;
	}
}