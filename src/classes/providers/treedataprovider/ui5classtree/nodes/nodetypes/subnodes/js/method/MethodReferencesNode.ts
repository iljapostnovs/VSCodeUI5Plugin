import {
	AbstractCustomClass,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../../../../../adapters/vscode/RangeAdapter";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Node } from "../../../../abstraction/Node";

export class MethodReferencesNode extends Node {
	readonly UIMethod: ICustomClassMethod;
	constructor(UIMethod: ICustomClassMethod, parser: IUI5Parser) {
		super(parser);
		this.UIMethod = UIMethod;

		const UIClass = this._parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof AbstractCustomClass) {
			const referenceCodeLens = new ReferenceCodeLensGenerator(parser);
			const locations =
				UIClass instanceof CustomJSClass
					? referenceCodeLens.getReferenceLocations(UIMethod)
					: referenceCodeLens.getTSReferenceLocations(UIMethod);
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
