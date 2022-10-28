import * as vscode from "vscode";
import { Node } from "../../../../abstraction/Node";
import { IAcornLocation, RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { UI5Plugin } from "../../../../../../../../../UI5Plugin";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, location: IAcornLocation) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		if (UIClass instanceof AbstractCustomClass && UIClass.fsPath) {
			const classUri = vscode.Uri.file(UIClass.fsPath);
			const range = RangeAdapter.acornLocationToVSCodeRange(location);
			this.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [classUri, {
					selection: range
				}]
			};
		}
	}
}