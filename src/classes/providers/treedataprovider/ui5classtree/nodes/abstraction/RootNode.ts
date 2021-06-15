import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
export abstract class RootNode extends vscode.TreeItem {
	readonly UIClass: CustomUIClass;
	constructor(UIClass: CustomUIClass) {
		super("");
		this.UIClass = UIClass;
	}
}