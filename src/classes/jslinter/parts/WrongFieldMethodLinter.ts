import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
export class WrongFieldMethodLinter extends Linter {
	getErrors(document: string): Error[] {
		console.time("JS Lint");
		let errors: Error[] = [];

		errors = this._getLintingErrors();

		console.timeEnd("JS Lint");
		return errors;
	}

	private _getLintingErrors(): Error[] {
		let errors: Error[] = [];

		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const acornMethods = UIClass.acornMethodsAndFields.filter(fieldOrMethod => fieldOrMethod.value.type === "FunctionExpression").map((node: any) => node.value.body);

			acornMethods.forEach((method: any) => {
				if (method.body) {
					method.body.forEach((node: any) => {
						const validationErrors = this._getErrorsForExpression(node, UIClass.classText);
						errors = errors.concat(validationErrors);
					});
				}
			});

		}

		//remove duplicates
		errors = errors.reduce((accumulator: Error[], error: Error) => {
			const sameError = accumulator.find(accumError => accumError.acornNode === error.acornNode);
			if (!sameError) {
				accumulator.push(error);
			}
			return accumulator;
		}, []);

		return errors;
	}

	private _getErrorsForExpression(node: any, document: string, errors: Error[] = []) {
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument() || "";

		if (node.type === "MemberExpression") {
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			let nodeStack = strategy.getStackOfNodesForPosition(currentClassName, node.end);
			if (nodeStack.length > 0) {
				const nodes = [];
				while(nodeStack.length > 0) {
					nodes.push(nodeStack.shift());
					const className = AcornSyntaxAnalyzer.findClassNameForStack(nodes.concat([]), currentClassName);
					const isException = this._checkIfClassNameIsException(className);
					if (className && !isException) {
						const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);

						let nextNode = nodeStack[0];
						if (nextNode?.type === "CallExpression") {
							nextNode = nodeStack.shift();
						}
						if (!nextNode) {
							nextNode = node;
						}
						if (nextNode && fieldsAndMethods) {
							const nextNodeName = nextNode.property?.name;
							const isMethodException = this._checkIfMethodNameIsException(className, nextNodeName);
							if (nextNodeName && !isMethodException) {
								const method = fieldsAndMethods.methods.find(method => method.name === nextNodeName);
								const field = fieldsAndMethods.fields.find(field => field.name === nextNodeName);
								if (!method && !field) {
									const position = LineColumn(document).fromIndex(nextNode.property.start - 1);
									if (position) {
										errors.push({
											message: `"${nextNodeName}" does not exist in "${className}"`,
											code: "",
											range: new vscode.Range(
												new vscode.Position(position.line - 1, position.col),
												new vscode.Position(position.line - 1, position.col + nextNodeName.length)
											),
											acornNode: nextNode
										});
										nodeStack = [];
									}
								}

							}
						}
					}
				}
			}
		}

		const innerNodes = AcornSyntaxAnalyzer.getContent(node);
		if (innerNodes) {
			innerNodes.forEach((node: any) => this._getErrorsForExpression(node, document, errors));
		}

		return errors;
	}

	private _checkIfClassNameIsException(className: string = "") {
		let isException = false;
		if (className.split(".").length === 1) {
			isException = true;
		}
		if (className === "array") {
			isException = true;
		}

		return isException;
	}

	private _checkIfMethodNameIsException(className: string = "", memberName: string = "") {
		const exceptions = ["byId", "prototype"];
		let isException = exceptions.includes(memberName);
		const classExceptions = [{
			className: "sap.ui.model.Binding",
			memberName: "filter"
		},{
			className: "sap.ui.model.Model",
			memberName: "getResourceBundle"
		},{
			className: "sap.ui.model.Model",
			memberName: "setProperty"
		}];

		if (!isException) {
			isException = !!classExceptions.find(classException => classException.className === className && classException.memberName === memberName);
		}


		return isException;
	}
}