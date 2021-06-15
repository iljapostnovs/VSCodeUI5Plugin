import { RootNode } from "../../abstraction/RootNode";
import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as path from "path";

export class FieldsNode extends RootNode {
	constructor(UIClass: CustomUIClass) {
		super(UIClass);
		this.label = `Fields (${UIClass.fields.filter(field => field.name !== "prototype").length})`;
		this.iconPath = path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "..", "icons", "icon-variable.svg");
	}
	collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
}