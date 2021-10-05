import { ICustomClassUIMethod, ICustomClassUIField } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { ReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts//util/ReferenceFinder";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { VSCodeLocationAdapter } from "../../../../ui5linter/adapters/VSCodeLocationAdapter";

export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: vscode.Location[]
	};
}

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = VSCodeTextDocumentTransformer.toCustomUIClass(document);
			if (UIClass) {
				const methods = UIClass.methods;

				methods.forEach(method => {
					if (method.memberPropertyNode) {
						const locations = this.getReferenceLocations(method);
						const range = RangeAdapter.acornLocationToVSCodeRange(method.memberPropertyNode.loc);
						const codeLens = new vscode.CodeLens(range);
						codeLens.command = {
							title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
							command: locations.length ? "editor.action.showReferences" : "",
							arguments: [document.uri, range.start, locations]
						};
						codeLenses.push(codeLens);
					}
				});
			}
		}

		return codeLenses;
	}

	public getReferenceLocations(member: ICustomClassUIMethod | ICustomClassUIField) {
		const referenceFinder = new ReferenceFinder(UI5Plugin.getInstance().parser);
		return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
	}
}