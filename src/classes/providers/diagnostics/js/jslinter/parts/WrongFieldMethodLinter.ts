import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { CustomDiagnosticType } from "../../../../../registrators/DiagnosticsRegistrator";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass, UI5Ignoreable } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { ConfigHandler } from "./config/ConfigHandler";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
export class WrongFieldMethodLinter extends Linter {
	protected className = "WrongFieldMethodLinter";
	public static timePerChar = 0;
	_getErrors(document: vscode.TextDocument): IError[] {
		let errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongFieldMethodLinter")) {
			// console.time("WrongFieldMethodLinter");
			const start = new Date().getTime();
			errors = this._getLintingErrors(document);
			const end = new Date().getTime();
			WrongFieldMethodLinter.timePerChar = (end - start) / document.getText().length;
			// console.timeEnd("WrongFieldMethodLinter");
		}

		return errors;
	}

	private _getLintingErrors(document: vscode.TextDocument): IError[] {
		let errors: IError[] = [];

		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const acornMethods = UIClass.acornMethodsAndFields.filter(fieldOrMethod => fieldOrMethod.value.type === "FunctionExpression").map((node: any) => node.value.body);

			acornMethods.forEach((method: any) => {
				if (method.body) {
					method.body.forEach((node: any) => {
						const validationErrors = this._getErrorsForExpression(node, UIClass, document);
						errors = errors.concat(validationErrors);
					});
				}
			});

		}

		return errors;
	}

	private _getErrorsForExpression(node: any, UIClass: CustomUIClass, document: vscode.TextDocument, errors: IError[] = [], droppedNodes: any[] = [], errorNodes: any[] = []) {
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
					let className = AcornSyntaxAnalyzer.findClassNameForStack(nodes.concat([]), currentClassName, currentClassName, true);
					const isException = this._checkIfClassNameIsException(className);
					if (!className || isException || nextNode?.type === "Identifier" && nextNode?.name === "sap") {
						droppedNodes.push(...nodeStack);
						break;
					}

					const classNames = className.split("|");
					nextNode = nodeStack[0];
					if (!nextNode) {
						nextNode = node;
					}
					const nextNodeName = nextNode.property?.name;
					const nodeText = UIClass.classText.substring(nextNode.start, nextNode.end);
					if (!nodeText.endsWith("]") && !errorNodes.includes(nextNode)) {
						const isMethodException = ConfigHandler.checkIfMemberIsException(className, nextNodeName);

						if (nextNodeName && !isMethodException) {
							const fieldsAndMethods = classNames.map(className => strategy.destructueFieldsAndMethodsAccordingToMapParams(className));
							const singleFieldsAndMethods = fieldsAndMethods.find(fieldsAndMethods => {
								if (nextNode && fieldsAndMethods && nextNodeName) {
									const method = fieldsAndMethods.methods.find(method => method.name === nextNodeName);
									const field = fieldsAndMethods.fields.find(field => field.name === nextNodeName);

									return method || field;
								}

								return false;
							});

							if (!singleFieldsAndMethods) {
								if (className.includes("__map__")) {
									className = "map";
								}
								const isMethodException = ConfigHandler.checkIfMemberIsException(className, nextNodeName);
								if (!isMethodException) {
									const range = RangeAdapter.acornLocationToVSCodeRange(nextNode.property.loc);
									errorNodes.push(nextNode);
									errors.push({
										message: `"${nextNodeName}" does not exist in "${className}"`,
										code: "UI5Plugin",
										source: "Field/Method Linter",
										range: range,
										acornNode: nextNode,
										type: CustomDiagnosticType.NonExistentMethod,
										methodName: nextNodeName,
										sourceClassName: className
									});
									break;
								}
							} else {
								const member = singleFieldsAndMethods.fields.find(field => field.name === nextNodeName) || singleFieldsAndMethods.methods.find(method => method.name === nextNodeName);
								const isIgnored = !!(<UI5Ignoreable>member)?.ui5ignored;
								if (!isIgnored) {
									let sErrorMessage = "";
									if (member?.visibility === "protected") {
										const currentDocumentClassName = FileReader.getClassNameFromPath(document.fileName);
										if (currentDocumentClassName && !UIClassFactory.isClassAChildOfClassB(currentDocumentClassName, singleFieldsAndMethods.className)) {
											sErrorMessage = `"${nextNodeName}" is a protected member of class "${member.owner}"`;
										}
									} else if (member?.visibility === "private") {
										const currentDocumentClassName = FileReader.getClassNameFromPath(document.fileName);
										if (currentDocumentClassName && member.owner !== currentDocumentClassName) {
											sErrorMessage = `"${nextNodeName}" is a private member of class "${member.owner}"`;
										}
									}

									if (sErrorMessage) {
										const range = RangeAdapter.acornLocationToVSCodeRange(nextNode.property.loc);
										errorNodes.push(nextNode);
										errors.push({
											message: sErrorMessage,
											code: "UI5Plugin",
											source: "Field/Method Linter",
											range: range,
											acornNode: nextNode,
											methodName: nextNodeName,
											sourceClassName: className,
											severity: vscode.DiagnosticSeverity.Error
										});
										break;
									}
								}
							}
						}
					} else if (nodeText.endsWith("]")) {
						droppedNodes.push(nextNode);
						if (nextNode.property) {
							droppedNodes.push(nextNode.property);
						}
						break;
					}
				}
			}
		}

		const innerNodes = AcornSyntaxAnalyzer.getContent(node);
		if (innerNodes) {
			innerNodes.forEach((node: any) => this._getErrorsForExpression(node, UIClass, document, errors, droppedNodes, errorNodes));
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
}