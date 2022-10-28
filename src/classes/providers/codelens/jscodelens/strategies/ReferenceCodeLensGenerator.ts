import {
	ICustomClassUIMethod,
	ICustomClassUIField,
	CustomUIClass
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { ReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts/util/ReferenceFinder";
import { TSReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts/util/TSReferenceFinder";
import { VSCodeLocationAdapter } from "../../../../ui5linter/adapters/VSCodeLocationAdapter";
import {
	CustomTSClass,
	ICustomClassTSConstructor
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { ICustomTSField, ICustomTSMethod, UI5Parser, UI5TSParser } from "ui5plugin-parser";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSObject";

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = VSCodeTextDocumentTransformer.toUIClass(document);
			if (UIClass) {
				if (UIClass instanceof CustomUIClass) {
					const methods = UIClass.methods;

					methods.forEach(method => {
						if (method.loc) {
							const locations = this.getReferenceLocations(method);
							const range = RangeAdapter.acornLocationToVSCodeRange(method.loc);
							const codeLens = new vscode.CodeLens(range);
							codeLens.command = {
								title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
								command: locations.length ? "editor.action.showReferences" : "",
								arguments: [document.uri, range.start, locations]
							};
							codeLenses.push(codeLens);
						}
					});
				} else if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
					const methods = UIClass.methods;
					const constructors = UIClass instanceof CustomTSClass ? UIClass.constructors : [];

					[...methods, ...constructors].forEach(method => {
						if (method.loc) {
							const locations = this.getTSReferenceLocations(method);
							const range = RangeAdapter.acornLocationToVSCodeRange(method.loc);
							const codeLens = new vscode.CodeLens(range);
							codeLens.command = {
								title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
								command: locations.length ? "editor.action.showReferences" : "",
								arguments: [document.uri, range.start, locations]
							};
							codeLenses.push(codeLens);
						}
					});

					UIClass.fields.forEach(field => {
						if (field.loc) {
							const locations = this.getTSReferenceLocations(field);
							const range = RangeAdapter.acornLocationToVSCodeRange(field.loc);
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
		const referenceFinder = new ReferenceFinder(AbstractUI5Parser.getInstance(UI5Parser));
		return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
	}

	public getTSReferenceLocations(member: ICustomClassTSConstructor | ICustomTSField | ICustomTSMethod) {
		const referenceFinder = new TSReferenceFinder(UI5TSParser.getInstance(UI5TSParser));
		return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
	}
}
