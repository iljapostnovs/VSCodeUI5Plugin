import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { CustomDiagnosticType } from "../../../../../registrators/DiagnosticsRegistrator";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass, UI5Ignoreable } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { ConfigHandler } from "./config/ConfigHandler";
import { Util } from "../../../../../utils/Util";
export class WrongFieldMethodLinter extends Linter {
	protected className = "WrongFieldMethodLinter";
	public static timePerChar = 0;
	private _timeSpent = 0;
	async _getErrors(document: vscode.TextDocument) {
		let errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongFieldMethodLinter")) {
			// console.time("WrongFieldMethodLinter");
			errors = await this._getLintingErrors(document);
			// console.timeEnd("WrongFieldMethodLinter");
			WrongFieldMethodLinter.timePerChar = this._timeSpent / document.getText().length;
		}

		return errors;
	}

	private async _getLintingErrors(document: vscode.TextDocument) {
		let errors: IError[] = [];
		const approximateTime = WrongFieldMethodLinter.timePerChar * document.getText().length;
		let partQuantity = 1;
		const pauseBetweenParts = 100;
		if (approximateTime > pauseBetweenParts) {
			partQuantity = Math.ceil(approximateTime / pauseBetweenParts);
		}
		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const acornMethods = UIClass.acornMethodsAndFields.filter(fieldOrMethod => fieldOrMethod.value.type === "FunctionExpression").map((node: any) => node.value.body);

			if (partQuantity > acornMethods.length) {
				partQuantity = acornMethods.length;
			}
			let parts = [];
			const methodContainerLength = Math.ceil(acornMethods.length / partQuantity);

			for (let index = 0; index < partQuantity; index++) {
				parts.push(acornMethods.slice(index * methodContainerLength, index * methodContainerLength + methodContainerLength));
			}
			parts = parts.filter(part => part.length > 0);

			for (const part of parts) {
				errors = await this._getLintingErrorsForMethods(part, UIClass, document, 0);
			}

		}

		return errors;
	}

	private _getLintingErrorsForMethods(acornMethods: any[], UIClass: CustomUIClass, document: vscode.TextDocument, timeout: number): Promise<IError[]> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const start = new Date().getTime();
				let errors: IError[] = [];
				acornMethods.forEach((acornMethod: any) => {
					if (acornMethod.body) {
						acornMethod.body.forEach((node: any) => {
							const validationErrors = this._getErrorsForExpression(node, UIClass, document);
							errors = errors.concat(validationErrors);
						});
					}
				});

				const end = new Date().getTime();
				this._timeSpent += end - start;
				resolve(errors);
			}, timeout);
		});
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
									const range = Util.positionsToVSCodeRange(UIClass.classText, nextNode.property.start, nextNode.property.end);
									if (range) {
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
									}
									break;
								}
							} else {
								const member = singleFieldsAndMethods.fields.find(field => field.name === nextNodeName) || singleFieldsAndMethods.methods.find(method => method.name === nextNodeName);
								const isIgnored = !!(<UI5Ignoreable>member)?.ui5ignored;
								const ignoreAccessLevelModifiers = vscode.workspace.getConfiguration("ui5.plugin").get("ignoreAccessLevelModifiers");
								if (!ignoreAccessLevelModifiers && !isIgnored) {
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
										const range = Util.positionsToVSCodeRange(UIClass.classText, nextNode.property.start, nextNode.property.end);
										if (range) {
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
										}
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