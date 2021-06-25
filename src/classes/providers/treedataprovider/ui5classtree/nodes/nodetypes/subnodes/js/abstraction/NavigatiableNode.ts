import * as vscode from "vscode";
import { UIClassFactory } from "../../../../../../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { Node } from "../../../../abstraction/Node";
import { Util } from "../../../../../../../../utils/Util";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, start: number, end: number) {
		const UIClass = UIClassFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass && UIClass.classFSPath) {
			const classUri = vscode.Uri.file(UIClass.classFSPath);
			const range = Util.positionsToVSCodeRange(UIClass.classText, start, end);
			if (range) {
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
}