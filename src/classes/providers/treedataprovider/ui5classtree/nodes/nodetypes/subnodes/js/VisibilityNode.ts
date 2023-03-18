import {
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { Node } from "../../../abstraction/Node";

export class VisibilityNode extends Node {
	readonly UIMember: ICustomClassMethod | ICustomClassField;
	constructor(UIMember: ICustomClassMethod | ICustomClassField, parser: IUI5Parser) {
		super(parser);
		this.UIMember = UIMember;
		this.label = `Visibility: ${UIMember.visibility}`;
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}
