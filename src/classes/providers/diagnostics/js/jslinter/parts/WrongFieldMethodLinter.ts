import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomDiagnosticType } from "../../../../../registrators/DiagnosticsRegistrator";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
export class WrongFieldMethodLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		let errors: Error[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongFieldMethodLinter")) {
			console.time("WrongFieldMethodLinter");
			errors = this._getLintingErrors(document);
			console.timeEnd("WrongFieldMethodLinter");
		}

		return errors;
	}

	private _getLintingErrors(document: vscode.TextDocument): Error[] {
		let errors: Error[] = [];

		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const acornMethods = UIClass.acornMethodsAndFields.filter(fieldOrMethod => fieldOrMethod.value.type === "FunctionExpression").map((node: any) => node.value.body);

			acornMethods.forEach((method: any) => {
				if (method.body) {
					method.body.forEach((node: any) => {
						const validationErrors = this._getErrorsForExpression(node, UIClass);
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

	private _getErrorsForExpression(node: any, UIClass: CustomUIClass, errors: Error[] = [], droppedNodes: any[] = []) {
		if (droppedNodes.includes(node)) {
			return [];
		}

		const currentClassName = UIClass.className;

		if (node.type === "MemberExpression") {
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			const nodeStack = strategy.getStackOfNodesForPosition(currentClassName, node.end);
			if (nodeStack.length > 0) {
				const nodes = [];
				while (nodeStack.length > 0) {
					let nextNode = nodeStack.shift();
					nodes.push(nextNode);
					nextNode = nodeStack[0];
					if (nextNode?.type === "CallExpression") {
						nextNode = nodeStack.shift();
						nodes.push(nextNode);
					}
					const className = AcornSyntaxAnalyzer.findClassNameForStack(nodes.concat([]), currentClassName, currentClassName, true);
					const isException = this._checkIfClassNameIsException(className);
					if (!className || isException || (nextNode?.type === "Identifier" && nextNode?.name === "sap")) {
						droppedNodes.push(...nodeStack);
						break;
					}

					const classNames = className.split("|");
					nextNode = nodeStack[0];
					if (!nextNode) {
						nextNode = node;
					}
					const nextNodeName = nextNode.property?.name;
					const isMethodException = this._checkIfMethodNameIsException(className, nextNodeName);

					if (nextNodeName && !isMethodException) {
						const fieldsAndMethods = classNames.map(className => strategy.destructueFieldsAndMethodsAccordingToMapParams(className));
						const singleFieldsAndMethods = fieldsAndMethods.find(fieldsAndMethods => {
							if (nextNode && fieldsAndMethods) {
								if (nextNodeName) {
									const method = fieldsAndMethods.methods.find(method => method.name === nextNodeName);
									const field = fieldsAndMethods.fields.find(field => field.name === nextNodeName);

									return method || field;
								}
							}

							return false;
						});

						if (!singleFieldsAndMethods) {
							const position = LineColumn(UIClass.classText).fromIndex(nextNode.property.start - 1);
							if (position) {
								errors.push({
									message: `"${nextNodeName}" does not exist in "${className}"`,
									code: "",
									range: new vscode.Range(
										new vscode.Position(position.line - 1, position.col),
										new vscode.Position(position.line - 1, position.col + nextNodeName.length)
									),
									acornNode: nextNode,
									type: CustomDiagnosticType.NonExistentMethod,
									methodName: nextNodeName,
									sourceClassName: className
								});
							}
							break;
						}
					}
				}
			}
		}

		const innerNodes = AcornSyntaxAnalyzer.getContent(node);
		if (innerNodes) {
			innerNodes.forEach((node: any) => this._getErrorsForExpression(node, UIClass, errors, droppedNodes));
		}

		return errors;
	}

	private _checkIfClassNameIsException(className = "") {
		let isException = false;
		const exceptions = ["void", "any", "array"];
		if (className.split(".").length === 1) {
			isException = true;
		} else if (exceptions.includes(className)) {
			isException = true;
		}

		return isException;
	}

	private _checkIfMethodNameIsException(className = "", memberName = "") {
		const methodExceptions = ["byId", "prototype"];
		let isException = methodExceptions.includes(memberName);
		const classExceptions = [{
			className: "sap.ui.model.Binding",
			memberName: "filter"
		}, {
			className: "sap.ui.model.Model",
			memberName: "getResourceBundle"
		}, {
			className: "sap.ui.model.Model",
			memberName: "setProperty"
		}, {
			className: "sap.ui.core.Element",
			memberName: "*"
		}, {
			className: "sap.ui.base.ManagedObject",
			memberName: "*"
		}, {
			className: "sap.ui.core.Control",
			memberName: "*"
		}];

		if (!isException) {
			isException = !!classExceptions.find(classException =>
				classException.className === className &&
				(classException.memberName === memberName || classException.memberName === "*")
			);
		}

		return isException;
	}
}