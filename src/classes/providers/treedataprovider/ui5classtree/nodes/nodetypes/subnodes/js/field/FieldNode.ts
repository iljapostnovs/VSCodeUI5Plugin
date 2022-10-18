import { ICustomClassUIField } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";


export class FieldNode extends NavigatiableNode {
	readonly UIField: ICustomClassUIField;
	constructor(UIField: ICustomClassUIField) {
		super();
		this.UIField = UIField;
		this.iconPath = this._buildIconPath("icon-variable.svg");
		const label = `${UIField.name}: ${UIField.type}`;
		this.label = label;

		if (UIField.loc) {
			this._addNavigationCommand(UIField.owner, UIField.loc);
		}

	}
	collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}