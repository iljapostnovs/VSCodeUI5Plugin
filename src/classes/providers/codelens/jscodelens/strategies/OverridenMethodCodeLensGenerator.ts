import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIMethod } from "../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomClassUIMethod } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";

export class OverridenMethodCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(): vscode.CodeLens[] {
		let codeLens: vscode.CodeLens[] = [];
		const currentClass = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClass) {
			const UIClass = UIClassFactory.getUIClass(currentClass);
			const rootMethods = UIClass.methods;
			if (UIClass.parentClassNameDotNotation) {
				const overriddenMethods: UIMethod[] = [];
				const parentMethods = this._getAllParentMethods(UIClass.parentClassNameDotNotation);

				rootMethods.forEach(method => {
					const methodFromParent = parentMethods.find(methodFromparent => methodFromparent.name === method.name);
					if (methodFromParent) {
						overriddenMethods.push(method);
					}
				});
				codeLens = this._generateCodeLensesForMethods(overriddenMethods);
			}
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

	private _generateCodeLensesForMethods(methods: CustomClassUIMethod[]) {
		const codeLenses: vscode.CodeLens[] = [];
		const document = vscode.window.activeTextEditor?.document;

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