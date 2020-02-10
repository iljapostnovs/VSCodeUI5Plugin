import * as vscode from "vscode";
import { UIClassFactory, FieldsAndMethods } from "./UI5Parser/UIClass/UIClassFactory";
import { FileReader } from "../Util/FileReader";
import { UIClassDefinitionFinder } from "./UI5Parser/UIClass/UIClassDefinitionFinder";
import { AbstractUIClass } from "./UI5Parser/UIClass/AbstractUIClass";

export class SyntaxAnalyzer {
	static getFieldsAndMethodsOfTheCurrentVariable(variable?: string) {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		if (!variable) {
			variable = this.getCurrentVariable();
		}
		const currentClassName = this.getCurrentClassName();
		const variableParts = variable.split(".");

		const activeTextEditor = vscode.window.activeTextEditor;
		if (currentClassName && activeTextEditor) {
			this.setNewContentForCurrentUIClass();

			const position = activeTextEditor.document.offsetAt(activeTextEditor.selection.start);

			const UIClass = UIClassFactory.getUIClass(currentClassName);
			UIClassDefinitionFinder.getAdditionalJSTypesHierarchically(UIClass);

			const UIClassName = this.getClassNameFromVariableParts(variableParts, UIClass, 1, position);
			if (UIClassName) {
				fieldsAndMethods = this.getFieldsAndMethodsFor("this", UIClassName);
			}
		}

		return fieldsAndMethods;
	}

	public static getClassNameFromVariableParts(variableParts: string[], theClass: AbstractUIClass, usedPartQuantity: number = 1, position?: number) : string | undefined {
		let classNameOfTheVariable: string | undefined;
		const thisIsByIdVar = this.getIfThisIsThisGetViewByIdMethod(variableParts);
		const thisShouldBeHandledInStandardWay = !thisIsByIdVar;

		if (thisShouldBeHandledInStandardWay) {
			const firstVariablePartIsThis = variableParts.length > 1 && variableParts[0] === "this";
			const thresholdForThis = firstVariablePartIsThis ? 1 : 0;
			usedPartQuantity += thresholdForThis;

			const variableString = this.getStringFromParts(variableParts, usedPartQuantity);
			let UIClass = theClass;

			const UIClassName = UIClassFactory.getClassOfTheVariableHierarchically(variableString, UIClass, position);

			if (UIClassName) {
				variableParts.splice(thresholdForThis, usedPartQuantity - thresholdForThis);

				if (variableParts.length === thresholdForThis) {
					classNameOfTheVariable = UIClassName;
				} else {
					UIClass = UIClassFactory.getUIClass(UIClassName);
					if (variableParts.length === 1) {
						variableParts = ["this"].concat(variableParts);
					}
					classNameOfTheVariable = this.getClassNameFromVariableParts(variableParts, UIClass, undefined, position);
				}
			} else if (usedPartQuantity < variableParts.length) {
				classNameOfTheVariable = this.getClassNameFromVariableParts(variableParts, theClass, ++usedPartQuantity);
			}
		} else {
			classNameOfTheVariable = this.getClassNameUsingVariableById(variableParts, theClass, usedPartQuantity, position);
		}

		return classNameOfTheVariable;
	}

	private static getIfThisIsThisGetViewByIdMethod(variableParts: string[]) {
		const joinedVariable = variableParts.join(".");
		const thisIsByIdVar = 	joinedVariable.startsWith("this.getView().byId(") ||
								joinedVariable.startsWith("this.byId(");

		return thisIsByIdVar;
	}

	private static getClassNameUsingVariableById(variableParts: string[], theClass: AbstractUIClass, usedPartQuantity: number = 1, position?: number) {
		let classNameOfTheVariable;
		//TODO: move this logic in same place from CustomUIClass as well

		const joinedVariable = variableParts.join(".");
		const thisIsByIdVariable = joinedVariable.startsWith("this.byId(");
		const thisIsGetViewByIdVariable = joinedVariable.startsWith("this.getView().byId(");

		if (thisIsByIdVariable || thisIsGetViewByIdVariable) {
			const controlIdResult = /(?<=this\.(getView\(\)\.)?byId\(").*?(?="\))/.exec(joinedVariable);
			const controlId = controlIdResult ? controlIdResult[0] : "";
			if (controlId) {
				classNameOfTheVariable = FileReader.getClassNameFromView(theClass.className, controlId);

				if (classNameOfTheVariable) {
					variableParts.splice(0, thisIsByIdVariable ? 2 : 3);
					if (variableParts.length > 0) {
						variableParts = ["this"].concat(variableParts);

						const UIClass = UIClassFactory.getUIClass(classNameOfTheVariable);
						classNameOfTheVariable = this.getClassNameFromVariableParts(variableParts, UIClass);
					}
				}
			}
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

			const currentClassName = this.getCurrentClassName();
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
			const iDeltaStart = this.getDeltaOfVariableBegining(-1);
			const rangeOfVariable = new vscode.Range(
				vscode.window.activeTextEditor.selection.start.translate({
					characterDelta: iDeltaStart
				}),
				vscode.window.activeTextEditor.selection.start
			);
			currentVariable = vscode.window.activeTextEditor.document.getText(rangeOfVariable);
			currentVariable = currentVariable.replace(".prototype", "");

			//remove last part of the var (it ends with .)
			const temporaryVariableParts = currentVariable.split(".");
			temporaryVariableParts.splice(temporaryVariableParts.length - 1, 1);
			currentVariable = temporaryVariableParts.join(".");
		}

		return currentVariable;
	}

	private static getDeltaOfVariableBegining(iDelta: number) {
		let deltaToReturn = iDelta;
		if (vscode.window.activeTextEditor) {
			const startingPosition = vscode.window.activeTextEditor.selection.start;
			let selectedText = "";
			let parenthesesCount = 0;
			let ignoreParentheses = false;

			let sCurrentChar = selectedText[0];
			do {
				sCurrentChar = selectedText[0];

				ignoreParentheses = parenthesesCount > 0;
				if (sCurrentChar === ")") {
					parenthesesCount++;
				} else if (sCurrentChar === "(") {
					parenthesesCount--;
				}

				const range = new vscode.Range(startingPosition.translate({
					characterDelta: deltaToReturn
				}), startingPosition);
				selectedText = vscode.window.activeTextEditor.document.getText(range);
				if (!this.isSeparator(sCurrentChar, ignoreParentheses)) {
					deltaToReturn += iDelta;
				} else {
					deltaToReturn += -iDelta;
				}

			} while (!this.isSeparator(sCurrentChar, ignoreParentheses) && startingPosition.character + deltaToReturn > 0);
		}
		deltaToReturn += -iDelta;

		return deltaToReturn;
	}

	public static isSeparator(char: string, ignoreParentheses: boolean) {
		//TODO: sync with FileReader
		const separators = ", 	;\n\t\r=:";

		return separators.indexOf(char) > -1 || (char === "(" && !ignoreParentheses);
	}

	static getCurrentActiveText() {
		let currentActiveText = "";
		if (vscode.window.activeTextEditor) {
			const iDeltaStart = this.getDeltaOfTheActiveTextBegining(-1);
			const rangeOfVariable = new vscode.Range(
				vscode.window.activeTextEditor.selection.start.translate({
					characterDelta: iDeltaStart
				}),
				vscode.window.activeTextEditor.selection.start
			);
			currentActiveText = vscode.window.activeTextEditor.document.getText(rangeOfVariable);
			currentActiveText = currentActiveText.replace(".prototype", "");
		}

		return currentActiveText;
	}

	private static getDeltaOfTheActiveTextBegining(iDelta: number) {
		const separatorExcludeChars = ", ";
		let deltaToReturn = iDelta;
		if (vscode.window.activeTextEditor) {
			const startingPosition = vscode.window.activeTextEditor.selection.start;
			let selectedText = "";
			let parenthesesCount = 1; //lets assume that all variables has one (
			let ignoreParentheses = false;

			let sCurrentChar = selectedText[0];
			do {
				sCurrentChar = selectedText[0];

				ignoreParentheses = parenthesesCount > 0;
				if (sCurrentChar === ")") {
					parenthesesCount++;
				} else if (sCurrentChar === "(") {
					parenthesesCount--;
				}

				const range = new vscode.Range(startingPosition.translate({
					characterDelta: deltaToReturn
				}), startingPosition);
				selectedText = vscode.window.activeTextEditor.document.getText(range);
				if (!this.isSeparator(sCurrentChar, ignoreParentheses) || separatorExcludeChars.indexOf(sCurrentChar) > -1) {
					deltaToReturn += iDelta;
				} else {
					deltaToReturn += -iDelta;
				}

			} while ((!this.isSeparator(sCurrentChar, ignoreParentheses) || separatorExcludeChars.indexOf(sCurrentChar) > -1) && startingPosition.character + deltaToReturn > 0);
		}
		deltaToReturn += -iDelta;

		return deltaToReturn;
	}
	/* =========================================================== */
	/* end: variable methods                                       */
	/* =========================================================== */

	/* =========================================================== */
	/* begin: Find Methods from class name                         */
	/* =========================================================== */

	static getUICompletionItemsWithUniqueViewIds() {
		let completionItems: UICompletionItem[] = [];

		const currentClass = this.getCurrentClassName();
		if (currentClass) {
			const view = FileReader.getViewText(currentClass);
			if (view) {
				const IdsResult = view.match(/(?<=id=").*(?="\s)/g);
				if (IdsResult) {
					completionItems = IdsResult.map(Id => {
						const uniqueViewId: UICompletionItem = {
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

	public static getCurrentClassName(documentText?: string) {
		let returnClassName;
		if (!documentText && vscode.window.activeTextEditor) {
			documentText = vscode.window.activeTextEditor.document.getText();
		}
		if (documentText) {
			const rCurrentClass = /(?<=.*\..*(extend|declareStaticClass)\(\").*(?=\")/;
			const rCurrentClassResults = rCurrentClass.exec(documentText);
			if (rCurrentClassResults) {
				returnClassName = rCurrentClassResults[0];
			} else {
				const classPath = vscode.window.activeTextEditor?.document.uri.fsPath;
				if (classPath) {
					returnClassName = FileReader.getClassNameFromPath(classPath);
				}
			}
		}

		return returnClassName;
	}
	/* =========================================================== */
	/* end: Find Methods from class name                           */
	/* =========================================================== */
}
export interface UICompletionItem {
	name: string;
	description: string;
	type: vscode.CompletionItemKind;
	visibility: string;
	parameters: any[];
	returnValue: string;
}