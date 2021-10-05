import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { RootNode } from "../../../abstraction/RootNode";

export class FieldsNode extends RootNode {
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = `Fields (${UIClass.fields.filter(field => field.name !== "prototype").length})`;
		this.iconPath = this._buildIconPath("icon-variable.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}