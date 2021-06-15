import * as vscode from "vscode";
import LineColumn = require("line-column");
import { ICustomClassUIMethod, CustomUIClass } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../../../../UI5Classes/UIClassFactory";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Node } from "../../../../abstraction/Node";


export class MethodReferencesNode extends Node {
	readonly UIMethod: ICustomClassUIMethod;
	constructor(UIMethod: ICustomClassUIMethod) {
		super();
		this.UIMethod = UIMethod;

		const UIClass = UIClassFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof CustomUIClass) {
			const referenceCodeLens = new ReferenceCodeLensGenerator();
			const locations = referenceCodeLens.getReferenceLocations(UIMethod);
			this.label = `References: ${locations.length}`;

			if (locations.length > 0 && UIMethod.memberPropertyNode && UIClass.classFSPath) {
				const positionBegin = LineColumn(UIClass.classText).fromIndex(UIMethod.memberPropertyNode.start);
				const positionEnd = LineColumn(UIClass.classText).fromIndex(UIMethod.memberPropertyNode.end);
				if (positionBegin && positionEnd) {
					const vscodePositionBegin = new vscode.Position(positionBegin.line - 1, positionBegin.col - 1);
					const vscodePositionEnd = new vscode.Position(positionEnd.line - 1, positionEnd.col - 1);
					const range = new vscode.Range(vscodePositionBegin, vscodePositionEnd);
					const uri = vscode.Uri.file(UIClass.classFSPath);
					this.command = {
						title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
						command: locations.length ? "editor.action.showReferences" : "",
						arguments: [uri, range.start, locations]
					};
				}
			}
		}
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}