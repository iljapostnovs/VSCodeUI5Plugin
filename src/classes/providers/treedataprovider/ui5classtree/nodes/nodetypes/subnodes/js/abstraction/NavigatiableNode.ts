import * as vscode from "vscode";
import { Node } from "../../../../abstraction/Node";
import { IAcornLocation, RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UI5Plugin } from "../../../../../../../../../UI5Plugin";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, location: IAcornLocation) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass && UIClass.classFSPath) {
			const classUri = vscode.Uri.file(UIClass.classFSPath);
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