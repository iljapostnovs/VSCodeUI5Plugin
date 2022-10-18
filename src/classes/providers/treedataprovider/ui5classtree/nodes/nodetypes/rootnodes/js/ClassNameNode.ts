import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class ClassNameNode extends RootNode {
	collapsibleState = vscode.TreeItemCollapsibleState.None;
	constructor(UIClass: AbstractCustomClass) {
		super(UIClass);
		this.label = UIClass.className;
	}
}