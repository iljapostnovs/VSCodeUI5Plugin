import * as vscode from "vscode";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";
import { ICustomClassUIField } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";


export class FieldNode extends NavigatiableNode {
	readonly UIField: ICustomClassUIField;
	constructor(UIField: ICustomClassUIField) {
		super();
		this.UIField = UIField;
		this.iconPath = this._buildIconPath("icon-variable.svg");
		const label = `${UIField.name}: ${UIField.type}`;
		this.label = label;

		if (UIField.memberPropertyNode) {
			this._addNavigationCommand(UIField.owner, UIField.memberPropertyNode.loc);
		}

	}
	collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}