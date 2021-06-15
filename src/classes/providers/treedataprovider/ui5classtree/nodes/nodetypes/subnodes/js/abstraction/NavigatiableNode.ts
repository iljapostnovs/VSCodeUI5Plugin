import * as vscode from "vscode";
import LineColumn = require("line-column");
import { UIClassFactory } from "../../../../../../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { Node } from "../../../../abstraction/Node";

export abstract class NavigatiableNode extends Node {
	protected _addNavigationCommand(className: string, start: number, end: number) {
		const UIClass = UIClassFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass && UIClass.classFSPath) {
			const classUri = vscode.Uri.file(UIClass.classFSPath);
			const lineColumnStart = LineColumn(UIClass.classText).fromIndex(start);
			const lineColumnEnd = LineColumn(UIClass.classText).fromIndex(end);
			if (lineColumnStart && lineColumnEnd) {
				this.command = {
					command: "vscode.open",
					title: "Open file",
					arguments: [classUri, {
						selection: new vscode.Range(
							lineColumnStart.line - 1, lineColumnStart.col - 1,
							lineColumnEnd.line - 1, lineColumnEnd.col - 1
						)
					}]
				};
			}
		}
	}
}