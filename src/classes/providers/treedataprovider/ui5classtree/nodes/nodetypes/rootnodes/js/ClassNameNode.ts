import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RootNode } from "../../../abstraction/RootNode";

export class ClassNameNode extends RootNode {
	collapsibleState = vscode.TreeItemCollapsibleState.None;
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = UIClass.className;
	}
}