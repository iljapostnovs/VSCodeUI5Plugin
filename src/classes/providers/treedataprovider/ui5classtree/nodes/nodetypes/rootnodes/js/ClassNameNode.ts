import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class ClassNameNode extends RootNode {
	collapsibleState = vscode.TreeItemCollapsibleState.None;
	constructor(UIClass: AbstractCustomClass, parser: IUI5Parser) {
		super(UIClass, parser);
		this.label = UIClass.className;
	}
}
