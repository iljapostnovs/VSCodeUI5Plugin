import * as vscode from "vscode";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Node } from "../../../../abstraction/Node";
import { RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { UI5Plugin } from "../../../../../../../../../UI5Plugin";
import { AbstractCustomClass, ICustomClassMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";


export class MethodReferencesNode extends Node {
	readonly UIMethod: ICustomClassMethod;
	constructor(UIMethod: ICustomClassMethod) {
		super();
		this.UIMethod = UIMethod;

		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof AbstractCustomClass) {
			const referenceCodeLens = new ReferenceCodeLensGenerator();
			const locations = UIClass instanceof CustomUIClass ? referenceCodeLens.getReferenceLocations(UIMethod) : referenceCodeLens.getTSReferenceLocations(UIMethod);
			this.label = `References: ${locations.length}`;

			if (locations.length > 0 && UIMethod.node && UIClass.fsPath && UIMethod.loc) {
				const range = RangeAdapter.acornLocationToVSCodeRange(UIMethod.loc);
				const uri = vscode.Uri.file(UIClass.fsPath);
				this.command = {
					title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
					command: locations.length ? "editor.action.showReferences" : "",
					arguments: [uri, range.start, locations]
				};
			}
		}
	}
	collapsibleState = vscode.TreeItemCollapsibleState.None;
}