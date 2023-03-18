import { ReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts/util/ReferenceFinder";
import { TSReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts/util/TSReferenceFinder";
import { ICustomTSField, ICustomTSMethod, UI5JSParser, UI5TSParser } from "ui5plugin-parser";
import {
	CustomJSClass,
	ICustomClassJSField,
	ICustomClassJSMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import {
	CustomTSClass,
	ICustomClassTSConstructor
} from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSObject";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { VSCodeLocationAdapter } from "../../../../ui5linter/adapters/VSCodeLocationAdapter";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = new VSCodeTextDocumentTransformer(this._parser).toUIClass(document);
			if (UIClass) {
				if (UIClass instanceof CustomJSClass) {
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

	public getReferenceLocations(member: ICustomClassJSMethod | ICustomClassJSField) {
		if (this._parser instanceof UI5JSParser) {
			const referenceFinder = new ReferenceFinder(this._parser);
			return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
		} else {
			return [];
		}
	}

	public getTSReferenceLocations(member: ICustomClassTSConstructor | ICustomTSField | ICustomTSMethod) {
		if (this._parser instanceof UI5TSParser) {
			const referenceFinder = new TSReferenceFinder(this._parser);
			return referenceFinder.getReferenceLocations(member).map(location => new VSCodeLocationAdapter(location));
		} else {
			return [];
		}
	}
}
