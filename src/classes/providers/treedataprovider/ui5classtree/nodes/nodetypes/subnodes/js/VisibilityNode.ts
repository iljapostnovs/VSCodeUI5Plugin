import { ICustomClassField, ICustomClassMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { Node } from "../../../abstraction/Node";


export class VisibilityNode extends Node {
	readonly UIMember: ICustomClassMethod | ICustomClassField;
	constructor(UIMember: ICustomClassMethod | ICustomClassField) {
		super();
		this.UIMember = UIMember;
		this.label = `Visibility: ${UIMember.visibility}`;
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}