import { IUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";

export class OverridenMethodCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		let codeLens: vscode.CodeLens[] = [];
		const UIClass = VSCodeTextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const rootMethods = UIClass.methods;
			const overriddenMethods: ICustomClassUIMethod[] = [];
			const parentMethods: IUIMethod[] = UIClass.parentClassNameDotNotation
				? UI5Plugin.getInstance().parser.classFactory.getClassMethods(UIClass.parentClassNameDotNotation, true)
				: [];

			rootMethods.forEach(method => {
				const methodFromParent = parentMethods.find(methodFromparent => methodFromparent.name === method.name);
				if (methodFromParent) {
					overriddenMethods.push(method);
				}
			});
			codeLens = this._generateCodeLensesForMethods(document, overriddenMethods);
		}

		return codeLens;
	}

	private _generateCodeLensesForMethods(document: vscode.TextDocument, methods: ICustomClassUIMethod[]) {
		const codeLenses: vscode.CodeLens[] = [];

		if (document) {
			methods.forEach(method => {
				if (method.position) {
					const positionBegin = document.positionAt(method.position);
					const range = new vscode.Range(positionBegin, positionBegin);

					codeLenses.push(
						new vscode.CodeLens(range, {
							command: "",
							tooltip: "",
							arguments: [],
							title: "override"
						})
					);
				}
			});
		}

		return codeLenses;
	}
}
