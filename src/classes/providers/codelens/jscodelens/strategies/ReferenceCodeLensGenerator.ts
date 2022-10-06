import {
	ICustomClassUIMethod,
	ICustomClassUIField,
	CustomUIClass
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { ReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts//util/ReferenceFinder";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { VSCodeLocationAdapter } from "../../../../ui5linter/adapters/VSCodeLocationAdapter";
import {
	CustomTSClass,
	ICustomClassTSField,
	ICustomClassTSMethod
} from "../../../../../typescript/parsing/classes/CustomTSClass";
import { TSReferenceFinder } from "./reference/TSReferenceFinder";
import { UI5TSParser } from "../../../../../typescript/parsing/UI5TSParser";

export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: vscode.Location[];
	};
}

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = VSCodeTextDocumentTransformer.toUIClass(document);
			if (UIClass) {
				if (UIClass instanceof CustomUIClass) {
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
				} else if (UIClass instanceof CustomTSClass) {
					const TSClass = UIClass as CustomTSClass;
					const methods = TSClass.methods;

					methods.forEach(method => {
						if (method.memberPropertyNode) {
							const locations = this.getTSReferenceLocations(method);
							if (locations.length > 0) {
								const range = RangeAdapter.acornLocationToVSCodeRange(method.memberPropertyNode.loc);
								const codeLens = new vscode.CodeLens(range);
								codeLens.command = {
									title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
									command: locations.length ? "editor.action.showReferences" : "",
									arguments: [document.uri, range.start, locations]
								};
								codeLenses.push(codeLens);
							}
						}
					});

					TSClass.fields.forEach(field => {
						if (field.memberPropertyNode) {
							const locations = this.getTSReferenceLocations(field);
							const range = RangeAdapter.acornLocationToVSCodeRange(field.memberPropertyNode.loc);
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
		}

		return codeLenses;
	}

	public getReferenceLocations(member: ICustomClassUIMethod | ICustomClassUIField) {
		const referenceFinder = new ReferenceFinder(UI5Plugin.getInstance().parser);
		return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
	}

	public getTSReferenceLocations(member: ICustomClassTSMethod | ICustomClassTSField) {
		const referenceFinder = new TSReferenceFinder(UI5TSParser.getInstance());
		return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
	}
}
