import * as vscode from "vscode";
import { ICustomClassUIMethod, CustomUIClass } from "../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../../../../UI5Classes/UIClassFactory";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Node } from "../../../../abstraction/Node";
import { Util } from "../../../../../../../../utils/Util";


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
				const range = Util.positionsToVSCodeRange(UIClass.classText, UIMethod.memberPropertyNode.start, UIMethod.memberPropertyNode.end);
				if (range) {
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