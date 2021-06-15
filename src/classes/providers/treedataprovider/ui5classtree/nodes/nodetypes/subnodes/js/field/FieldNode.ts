import * as vscode from "vscode";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";
import * as path from "path";
import { ICustomClassUIField } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";


export class FieldNode extends NavigatiableNode {
	readonly UIField: ICustomClassUIField;
	constructor(UIField: ICustomClassUIField) {
		super();
		this.UIField = UIField;
		this.iconPath = path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "..", "..", "..", "icons", "icon-variable.svg");
		const label = `${UIField.name}: ${UIField.type}`;
		this.label = label;

		if (UIField.memberPropertyNode) {
			this._addNavigationCommand(UIField.owner, UIField.memberPropertyNode.start, UIField.memberPropertyNode.end);
		}

	}
	collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}