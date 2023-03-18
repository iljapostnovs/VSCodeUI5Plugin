import { IUIMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { ICustomClassJSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";

export class OverridenMethodCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		let codeLens: vscode.CodeLens[] = [];
		const UIClass = new VSCodeTextDocumentTransformer(this._parser).toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const rootMethods = UIClass.methods;
			const overriddenMethods: ICustomClassJSMethod[] = [];
			const parentMethods: IUIMethod[] = UIClass.parentClassNameDotNotation
				? this._parser.classFactory.getClassMethods(UIClass.parentClassNameDotNotation, true)
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

	private _generateCodeLensesForMethods(document: vscode.TextDocument, methods: ICustomClassJSMethod[]) {
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
