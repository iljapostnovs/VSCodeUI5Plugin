import { ICustomClassMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { Node } from "../../../../abstraction/Node";
import { Util } from "./util/Util";


export class MethodLinesNode extends Node {
	readonly UIMethod: ICustomClassMethod;
	constructor(UIMethod: ICustomClassMethod) {
		super();
		this.UIMethod = UIMethod;

		const methodLines = Util.getMethodLines(UIMethod) || 0;
		this.label = `Lines: ${methodLines}`;
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}