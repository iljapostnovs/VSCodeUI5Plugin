import * as vscode from "vscode";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassDefinitionFinder } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassDefinitionFinder";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { UIMethod, AbstractUIClass } from "../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";

export class SignatureHelpProvider {
	static getSignature() {
		const signatureHelp = new vscode.SignatureHelp();

		let currentVariable = SyntaxAnalyzer.getCurrentActiveText().trim();
		const parenthesesAreOpen = this.getIfParenthesesAreOpen(currentVariable);
		if (currentVariable && parenthesesAreOpen) {
			let currentParamIndex = currentVariable.length - 1;
			while (currentVariable[currentParamIndex] !== "(" && currentParamIndex > 0) {
				currentParamIndex--;
			}
			const currentParams = currentVariable.substring(currentParamIndex, currentVariable.length);
			currentVariable = currentVariable.substring(0, currentParamIndex);

			const thisIsConstructor = currentVariable.startsWith("new ");
			if (thisIsConstructor) {
				currentVariable = currentVariable.replace("new ", "") + ".constructor";
			}

			const currentMethodParts = currentVariable.split(".");
			const currentMethodText = currentMethodParts[currentMethodParts.length - 1];
			currentMethodParts.splice(currentMethodParts.length - 1, 1);
			const variableToGetClassFrom = currentMethodParts.join(".");
			const variableClass = UIClassDefinitionFinder.getVariableClass(variableToGetClassFrom);

			if (variableClass) {
				const UIClass = UIClassFactory.getUIClass(variableClass);
				const currentMethod = this.getMethodRecursively(UIClass, currentMethodText);
				if (currentMethod && currentMethod.params.length > 0) {
					signatureHelp.activeParameter = currentParams.split(",").length - 1;
					const signature = new vscode.SignatureInformation(currentMethod.description || currentMethodText);
					signature.parameters = currentMethod.params.map(param => {
						return new vscode.ParameterInformation(param, param/**this one is showing */);
					});

					signatureHelp.signatures = [signature];


					return signatureHelp;
				}
			}
		}
	}

	private static getMethodRecursively(UIClass: AbstractUIClass, methodName: string) : UIMethod | undefined {
		let methodToReturn: UIMethod | undefined;
		methodToReturn = UIClass.methods.find(method => method.name === methodName);

		if (!methodToReturn && UIClass.parentClassNameDotNotation) {
			UIClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);

			methodToReturn = this.getMethodRecursively(UIClass, methodName);
		}

		return methodToReturn;
	}

	private static getIfParenthesesAreOpen(variable: string) {
		let parenthesesCount = 0;
		let i = 0;
		while (i < variable.length) {
			if (variable[i] === "(") {
				parenthesesCount++;
			} else if (variable[i] === ")") {
				parenthesesCount--;
			}
			i++;
		}

		return parenthesesCount !== 0;
	}
}