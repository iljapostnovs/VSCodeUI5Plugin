import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class FieldsNode extends RootNode {
	constructor(UIClass: AbstractCustomClass) {
		super(UIClass);
		this.label = `Fields (${UIClass.fields.filter(field => field.name !== "prototype").length})`;
		this.iconPath = this._buildIconPath("icon-variable.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}