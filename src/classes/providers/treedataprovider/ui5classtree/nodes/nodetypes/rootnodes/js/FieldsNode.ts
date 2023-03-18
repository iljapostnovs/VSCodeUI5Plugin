import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class FieldsNode extends RootNode {
	constructor(UIClass: AbstractCustomClass, parser: IUI5Parser) {
		super(UIClass, parser);
		this.label = `Fields (${UIClass.fields.filter(field => field.name !== "prototype").length})`;
		this.iconPath = this._buildIconPath("icon-variable.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}