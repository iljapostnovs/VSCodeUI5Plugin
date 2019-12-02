import * as vscode from "vscode";
import { UIClassFactory, FieldsAndMethods } from "./UI5Parser/UIClass/UIClassFactory";
import { FileReader } from "../Util/FileReader";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";

export class SyntaxAnalyzer {
	static getFieldsAndMethodsOfTheCurrentVariable() {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		let variable = this.getCurrentVariable();
		//remove last part of the var begin
		let temporaryVariableParts = variable.split(".");
		temporaryVariableParts.splice(temporaryVariableParts.length - 1, 1);
		variable = temporaryVariableParts.join(".");
		//remove last part of the var end
		const currentClassName = this.gerCurrentClass();
		let variableParts = variable.split(".");

		if (currentClassName) {
			this.setNewContentForCurrentUIClass();

			if (variableParts[0] === "this" && variableParts.length > 1) {
				let UIClassName = this.getClassNameFromVariableParts(variableParts, currentClassName);
				if (UIClassName) {
					fieldsAndMethods = this.getFieldsAndMethodsFor("this", UIClassName);
				}
			} else {
				if (vscode.window.activeTextEditor) {
					const position = vscode.window.activeTextEditor.document.offsetAt(vscode.window.activeTextEditor.selection.start);
					if (currentClassName) {
						fieldsAndMethods = this.getFieldsAndMethodsFor(variable, currentClassName, position);
					}
				}
			}
		}

		return fieldsAndMethods;
	}

	public static getClassNameFromVariableParts(variableParts: string[], className: string, usedPartQuantity: number = 2) : string | undefined {
		//first part should be "this"
		let classNameOfTheVariable: string | undefined;

		let variableString = this.getStringFromParts(variableParts, usedPartQuantity);
		let UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		let UIClassName = UIClassFactory.getClassOfTheVariableHierarchically(variableString, UIClass);

		if (UIClassName) {
			variableParts.splice(1, usedPartQuantity - 1);

			if (variableParts.length === 1) {
				classNameOfTheVariable = UIClassName;
			} else {
				classNameOfTheVariable = this.getClassNameFromVariableParts(variableParts, UIClassName);
			}
		} else if (usedPartQuantity < variableParts.length) {
			classNameOfTheVariable = this.getClassNameFromVariableParts(variableParts, className, ++usedPartQuantity);
		}

		return classNameOfTheVariable;
	}

	private static getStringFromParts(parts: string[], partQuantityToUse: number) {
		let partQuantityUsed = 0;
		let concatenatedString = "";
		while (partQuantityUsed < partQuantityToUse) {
			concatenatedString += parts[partQuantityUsed] + ".";
			partQuantityUsed++;
		}

		concatenatedString = concatenatedString.substring(0, concatenatedString.length - 1); //remove last dot

		return concatenatedString;
	}

	private static setNewContentForCurrentUIClass() {
		if (vscode.window.activeTextEditor) {
			let documentText = vscode.window.activeTextEditor.document.getText();
			const position = vscode.window.activeTextEditor.document.offsetAt(vscode.window.activeTextEditor.selection.start);

			const currentClassName = this.gerCurrentClass();
			if (currentClassName) {
				documentText = documentText.substring(0, position - 1) + ";" + documentText.substring(position, documentText.length);
				UIClassFactory.setNewCodeForClass(currentClassName, documentText);
			} else {
				debugger;
			}
		}
	}

	private static getFieldsAndMethodsFor(variable: string, className: string, position: number = 0) {
		let fieldsAndMethods;
		if (vscode.window.activeTextEditor) {
			fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForVariable(variable, className, position);
		}
		return fieldsAndMethods;
	}

	/* =========================================================== */
	/* begin: variable methods                                     */
	/* =========================================================== */
	static getCurrentVariable() {
		let currentVariable = "";
		if (vscode.window.activeTextEditor) {
			let iDeltaStart = this.getDeltaOfVariableBegining(-1);
			let rangeOfVariable = new vscode.Range(vscode.window.activeTextEditor.selection.start.translate(0, iDeltaStart), vscode.window.activeTextEditor.selection.start);
			currentVariable = vscode.window.activeTextEditor.document.getText(rangeOfVariable);
			currentVariable = currentVariable.replace(".prototype", "");
		}

		return currentVariable;
	}

	private static getDeltaOfVariableBegining(iDelta: number) {
		let deltaToReturn = iDelta;
		if (vscode.window.activeTextEditor) {
			let startingPosition = vscode.window.activeTextEditor.selection.start;
			let selectedText = "";

			while (!this.isSeparator(selectedText[iDelta > 0 ? selectedText.length - 1 : 0])) {
				let range = new vscode.Range(startingPosition.translate(0, deltaToReturn < 0 ? deltaToReturn : 0), startingPosition.translate(0, deltaToReturn > 0 ? deltaToReturn : 0));
				selectedText = vscode.window.activeTextEditor.document.getText(range);
				if (!this.isSeparator(selectedText[iDelta > 0 ? selectedText.length - 1 : 0])) {
					deltaToReturn += iDelta;
				} else {
					deltaToReturn += -iDelta;
				}
			}

		}

		return deltaToReturn;
	}

	private static isSeparator(char: string) {
		//TODO: sync with FileReader
		return char === " " || char === "	" || char === ";" || char === "\n" || char === "\t" || char === "\r" || char === "(" || char === "=";
	}
	/* =========================================================== */
	/* end: variable methods                                       */
	/* =========================================================== */

	/* =========================================================== */
	/* begin: Find Methods from class name                         */
	/* =========================================================== */

	static getUICompletionItemsWithUniqueViewIds() {
		let completionItems: UICompletionItem[] = [];

		const currentClass = this.gerCurrentClass();
		if (currentClass) {
			const view = FileReader.getViewText(currentClass);
			if (view) {
				let IdsResult = view.match(/(?<=id=").*(?="\s)/g);
				if (IdsResult) {
					completionItems = IdsResult.map(Id => {
						let uniqueViewId: UICompletionItem = {
							name: Id,
							type: vscode.CompletionItemKind.Keyword,
							description: Id,
							visibility: "public",
							parameters: [],
							returnValue: "void"
						};

						return uniqueViewId;
					});
				}
			}
		}

		return completionItems;
	}

	public static gerCurrentClass(documentText?: string) {
		let returnClassName;
		if (!documentText && vscode.window.activeTextEditor) {
			documentText = vscode.window.activeTextEditor.document.getText();
		}
		if (documentText) {
			const rCurrentClass = /(?<=.*\..*\(\").*(?=\")/;
			const rCurrentClassResults = rCurrentClass.exec(documentText);
			if (rCurrentClassResults) {
				returnClassName = rCurrentClassResults[0];
			}
		}

		return returnClassName;
	}
	/* =========================================================== */
	/* end: Find Methods from class name                           */
	/* =========================================================== */
}
export interface UICompletionItem {
	name: string,
	description: string,
	type: vscode.CompletionItemKind,
	visibility: string,
	parameters: any[],
	returnValue: string
}