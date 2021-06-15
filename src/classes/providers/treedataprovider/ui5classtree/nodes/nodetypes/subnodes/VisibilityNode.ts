import * as vscode from "vscode";
import { ICustomClassUIField, ICustomClassUIMethod } from "../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { Node } from "../../abstraction/Node";


export class VisibilityNode extends Node {
	readonly UIMember: ICustomClassUIMethod | ICustomClassUIField;
	constructor(UIMember: ICustomClassUIMethod | ICustomClassUIField) {
		super();
		this.UIMember = UIMember;
		this.label = `Visibility: ${UIMember.visibility}`;
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}