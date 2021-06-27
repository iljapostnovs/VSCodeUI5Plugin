import * as vscode from "vscode";
import { UIClassFactory } from "../../../../../../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { Node } from "../../../../abstraction/Node";
import { IAcornLocation, RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, location: IAcornLocation) {
		const UIClass = UIClassFactory.getUIClass(className);
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