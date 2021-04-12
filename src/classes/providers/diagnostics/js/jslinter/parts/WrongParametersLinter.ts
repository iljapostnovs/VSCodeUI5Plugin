import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { SAPNodeDAO } from "../../../../../librarydata/SAPNodeDAO";
import { ConfigHandler } from "./config/ConfigHandler";
export class WrongParametersLinter extends Linter {
	public static timePerChar = 0;
	private static readonly _sapNodeDAO = new SAPNodeDAO();
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		// console.time("WrongParameterLinter");
		const start = new Date().getTime();
		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongParametersLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.acornClassBody) {
					UIClass.acornClassBody.properties.forEach((node: any) => {
						const content = AcornSyntaxAnalyzer.expandAllContent(node.value);
						const calls = content.filter(node => node.type === "CallExpression");
						calls.forEach(call => {
							const params = call.arguments;
							const methodName = call.callee?.property?.name;
							const endPosition = call.callee?.property?.end;
							if (methodName && endPosition) {
								const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
								const classNameOfTheMethodCallee = strategy.acornGetClassName(className, endPosition);
								if (classNameOfTheMethodCallee) {
									const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(classNameOfTheMethodCallee);
									if (fieldsAndMethods) {
										const method = fieldsAndMethods.methods.find(method => method.name === methodName);
										if (method) {
											const isException = ConfigHandler.checkIfMethodNameIsException(fieldsAndMethods.className, method.name);
											if (!isException) {

												const methodParams = method.params;
												const mandatoryMethodParams = methodParams.filter(param => !param.isOptional && param.type !== "boolean");
												if (params.length < mandatoryMethodParams.length || params.length > methodParams.length) {
													const positionStart = LineColumn(UIClass.classText).fromIndex(call.callee.property.start);
													const positionEnd = LineColumn(UIClass.classText).fromIndex(call.callee.property.end);
													if (positionStart && positionEnd) {
														errors.push({
															acornNode: call,
															code: "UI5Plugin",
															source: "Parameter Linter",
															message: `Method "${methodName}" has ${methodParams.length} (${mandatoryMethodParams.length} mandatory) param(s), but you provided ${params.length}`,
															range: new vscode.Range(
																new vscode.Position(positionStart.line - 1, positionStart.col - 1),
																new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
															)
														});
													}
												}

												params.forEach((param: any, i: number) => {
													const paramFromMethod = method.params[i];
													if (paramFromMethod && (paramFromMethod.type !== "any" && paramFromMethod.type !== "void" && paramFromMethod.type)) {
														const classNameOfTheParam = AcornSyntaxAnalyzer.getClassNameFromSingleAcornNode(param, UIClass);

														if (classNameOfTheParam && classNameOfTheParam !== paramFromMethod.type) {
															const paramFromMethodTypes = paramFromMethod.type.split("|");
															const classNamesOfTheParam = classNameOfTheParam.split("|");
															let typeMismatch = !this._getIfClassNameIntersects(paramFromMethodTypes, classNamesOfTheParam);
															if (typeMismatch) {
																typeMismatch = !paramFromMethodTypes.find(className => {
																	return !!classNamesOfTheParam.find(classNameOfTheParam => {
																		return !this._getIfClassesDiffers(className, classNameOfTheParam)
																	});
																});
															}
															if (typeMismatch) {
																typeMismatch = !ConfigHandler.checkIfMethodNameIsException(classNameOfTheParam, method.name);
															}
															if (typeMismatch) {
																const positionStart = LineColumn(UIClass.classText).fromIndex(param.start);
																const positionEnd = LineColumn(UIClass.classText).fromIndex(param.end);
																if (positionStart && positionEnd) {
																	errors.push({
																		acornNode: param,
																		code: "UI5Plugin",
																		source: "Parameter Linter",
																		message: `"${paramFromMethod.name}" parameter is of type "${classNameOfTheParam}", but expected "${paramFromMethod.type}"`,
																		range: new vscode.Range(
																			new vscode.Position(positionStart.line - 1, positionStart.col - 1),
																			new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
																		)
																	});
																}
															}
														}
													}

												});
											}
										}
									}
								}
							}
						});
					});
				}
			}
		}

		const end = new Date().getTime();
		WrongParametersLinter.timePerChar = (end - start) / document.getText().length;
		// console.timeEnd("WrongParameterLinter");
		return errors;
	}

	private _getIfClassNameIntersects(classNames1: string[], classNames2: string[]) {
		return !!classNames1.find(className1 => {
			return !!classNames2.find(className2 => className1 === className2);
		});
	}

	private _getIfClassesDiffers(expectedClass: string, actualClass: string) {
		let classesDiffers = true;
		const numbers = ["number", "float", "int", "integer"];

		expectedClass = this._swapClassNames(expectedClass);
		actualClass = this._swapClassNames(actualClass);
		if (expectedClass.endsWith("[]") && actualClass.endsWith("[]")) {
			expectedClass = expectedClass.replace("[]", "");
			actualClass = actualClass.replace("[]", "");
		}

		if (this._checkIfClassesAreEqual(expectedClass, actualClass, "map", "object")) {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === "any" || actualClass.toLowerCase() === "any") {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === actualClass.toLowerCase()) {
			classesDiffers = false;
		} else if (numbers.includes(expectedClass.toLowerCase()) && numbers.includes(actualClass.toLowerCase())) {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === "object" && UIClassFactory.isClassAChildOfClassB(actualClass, "sap.ui.base.Object")) {
			classesDiffers = false;
		} else if (actualClass.toLowerCase() === "object" && UIClassFactory.isClassAChildOfClassB(expectedClass, "sap.ui.base.Object")) {
			classesDiffers = false;
		} else if (this._checkIfClassesAreEqual(expectedClass, actualClass, "string", "sap.ui.core.csssize")) {
			classesDiffers = false;
		} else if (WrongParametersLinter._sapNodeDAO.findNode(expectedClass)?.getKind() === "enum" && actualClass === "string") {
			classesDiffers = false;
		} else {
			classesDiffers = !UIClassFactory.isClassAChildOfClassB(actualClass, expectedClass);
		}

		return classesDiffers;
	}

	private _checkIfClassesAreEqual(class1: string, class2: string, substitute1: string, substitute2: string) {
		return class1.toLowerCase() === substitute1 && class2.toLowerCase() === substitute2 ||
			class1.toLowerCase() === substitute2 && class2.toLowerCase() === substitute1;
	}

	private _swapClassNames(className: string) {
		if (className.endsWith("array")) {
			className = "any[]";
		}
		if (className.includes("__map__") || className.includes("__mapparam__")) {
			className = "map";
		}
		if (className === "void" || !className) {
			className = "any";
		}

		return className;
	}
}