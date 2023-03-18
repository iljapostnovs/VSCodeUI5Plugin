import { ICustomClassJSField } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";

export class FieldNode extends NavigatiableNode {
	readonly UIField: ICustomClassJSField;
	constructor(UIField: ICustomClassJSField, parser: IUI5Parser) {
		super(parser);
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
