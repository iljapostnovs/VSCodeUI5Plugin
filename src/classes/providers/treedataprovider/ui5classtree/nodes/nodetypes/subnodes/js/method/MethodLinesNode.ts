import { ICustomClassMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { Node } from "../../../../abstraction/Node";
import { Util } from "./util/Util";

export class MethodLinesNode extends Node {
	readonly UIMethod: ICustomClassMethod;
	constructor(UIMethod: ICustomClassMethod, parser: IUI5Parser) {
		super(parser);
		this.UIMethod = UIMethod;

		const methodLines = new Util(parser).getMethodLines(UIMethod) || 0;
		this.label = `Lines: ${methodLines}`;
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}
