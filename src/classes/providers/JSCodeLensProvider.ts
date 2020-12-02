import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { UIMethod } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomClassUIMethod } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FileReader } from "../utils/FileReader";
import { ResourceModelData } from "../UI5Classes/ResourceModelData";

export class JSCodeLensProvider {
	static getCodeLenses() : Promise<vscode.CodeLens[]> {
		return new Promise(resolve => {
			let codeLenses: vscode.CodeLens[] = [];
			setTimeout(() => {
				// SyntaxAnalyzer.setNewContentForCurrentUIClass();
				const currentClass = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
				if (currentClass) {
					const UIClass = UIClassFactory.getUIClass(currentClass);
					const rootMethods = UIClass.methods;
					if (UIClass.parentClassNameDotNotation) {
						const overriddenMethods: UIMethod[] = [];
						const parentMethods = this.getAllParentMethods(UIClass.parentClassNameDotNotation);

						rootMethods.forEach(method => {
							const methodFromParent = parentMethods.find(methodFromparent => methodFromparent.name === method.name);
							if (methodFromParent) {
								overriddenMethods.push(method);
							}
						});

						const i18nCodeLenses = this.generateInternalizationCodeLenses();
						codeLenses = this.generateCodeLensesForMethods(overriddenMethods).concat(i18nCodeLenses);

						resolve(codeLenses);
					}
				}
			}, 200);
		});
	}

	private static generateInternalizationCodeLenses() {
		const codeLenses: vscode.CodeLens[] = [];
		const document = vscode.window.activeTextEditor?.document;

		const componentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
		if (componentName && document) {
			const currentResourceModelTexts = ResourceModelData.resourceModels[componentName];
			const XMLText = document.getText();

			const rTranslatedTexts = /(?<=\.getText\()".*"/g;
			let results = rTranslatedTexts.exec(XMLText);
			while (results) {
				results = results || [];
				if (results && results[0]) {
					results[0] = results[0].substring(1, results[0].length - 1); //crop ""
				}
				const positionBegin = document.positionAt(results.index + 1);
				const positionEnd = document.positionAt(results.index + results[0].length);
				const range = new vscode.Range(positionBegin, positionEnd);

				if (results[0]) {
					results[0] = `{i18n>${results[0]}}`;
				}
				const currentText = currentResourceModelTexts.find(text => text.text === (results || [])[0]);
				if (currentText) {
					const codeLens = new vscode.CodeLens(range, {
						command: "ui5plugin.gotoresourcemodel",
						tooltip: currentText?.description || "",
						arguments: [/(?<=\{i18n>).*?(?=\})/.exec(currentText?.text || "")],
						title: currentText?.description || ""
					});

					codeLenses.push(codeLens);
				}
				results = rTranslatedTexts.exec(XMLText);
			}
		}

		return codeLenses;
	}

	private static getAllParentMethods(className: string) {
		const UIClass = UIClassFactory.getUIClass(className);
		let methods = UIClass.methods;

		if (UIClass.parentClassNameDotNotation) {
			methods = methods.concat(this.getAllParentMethods(UIClass.parentClassNameDotNotation));
		}

		return methods;
	}

	private static generateCodeLensesForMethods(methods: CustomClassUIMethod[]) {
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