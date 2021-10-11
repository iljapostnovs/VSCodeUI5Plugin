import * as vscode from "vscode";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Node } from "../../../../abstraction/Node";
import { RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { ICustomClassUIMethod, CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UI5Plugin } from "../../../../../../../../../UI5Plugin";


export class MethodReferencesNode extends Node {
	readonly UIMethod: ICustomClassUIMethod;
	constructor(UIMethod: ICustomClassUIMethod) {
		super();
		this.UIMethod = UIMethod;

		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof CustomUIClass) {
			const referenceCodeLens = new ReferenceCodeLensGenerator();
			const locations = referenceCodeLens.getReferenceLocations(UIMethod);
			this.label = `References: ${locations.length}`;

			if (locations.length > 0 && UIMethod.memberPropertyNode && UIClass.classFSPath) {
				const range = RangeAdapter.acornLocationToVSCodeRange(UIMethod.memberPropertyNode.loc);
				const uri = vscode.Uri.file(UIClass.classFSPath);
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