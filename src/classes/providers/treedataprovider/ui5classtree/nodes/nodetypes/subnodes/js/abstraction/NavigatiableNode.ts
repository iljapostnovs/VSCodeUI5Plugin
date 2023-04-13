import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import * as vscode from "vscode";
import { IAcornLocation, RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { Node } from "../../../../abstraction/Node";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, location: IAcornLocation) {
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass instanceof AbstractCustomClass && UIClass.fsPath) {
			const classUri = vscode.Uri.file(UIClass.fsPath);
			const range = RangeAdapter.acornLocationToVSCodeRange(location);
			this.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [
					classUri,
					{
						selection: range
					}
				]
			};
		}
	}
}
