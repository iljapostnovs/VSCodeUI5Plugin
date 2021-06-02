import * as vscode from "vscode";
import { ICustomClassUIMethod } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { TextDocumentTransformer } from "../../../../utils/TextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";

export class OverridenMethodCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		let codeLens: vscode.CodeLens[] = [];
		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const rootMethods = UIClass.methods;
			const overriddenMethods: ICustomClassUIMethod[] = [];
			const parentMethods = this._getAllParentMethods(UIClass.parentClassNameDotNotation);

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
	private _getAllParentMethods(className: string) {
		const UIClass = UIClassFactory.getUIClass(className);
		let methods = UIClass.methods;

		if (UIClass.parentClassNameDotNotation) {
			methods = methods.concat(this._getAllParentMethods(UIClass.parentClassNameDotNotation));
		}

		return methods;
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