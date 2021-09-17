import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass, ICustomClassUIMethod } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { SAPNodeDAO } from "../../../../../librarydata/SAPNodeDAO";
import { ConfigHandler } from "./config/ConfigHandler";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
export class WrongParametersLinter extends Linter {
	protected className = "WrongParametersLinter";
	public static timePerChar = 0;
	private static readonly _sapNodeDAO = new SAPNodeDAO();
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

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
										if (method && !(<ICustomClassUIMethod>method).ui5ignored) {
											const isException = ConfigHandler.checkIfMemberIsException(fieldsAndMethods.className, method.name);
											if (!isException) {

												const methodParams = method.params;
												const mandatoryMethodParams = methodParams.filter(param => !param.isOptional && param.type !== "boolean");
												if (params.length < mandatoryMethodParams.length || params.length > methodParams.length) {
													const range = RangeAdapter.acornLocationToVSCodeRange(call.callee.property.loc);
													errors.push({
														acornNode: call,
														code: "UI5Plugin",
														source: "Parameter Linter",
														message: `Method "${methodName}" has ${methodParams.length} (${mandatoryMethodParams.length} mandatory) param(s), but you provided ${params.length}`,
														range: range
													});
												}

												params.forEach((param: any, i: number) => {
													const paramFromMethod = method.params[i];
													if (paramFromMethod && (paramFromMethod.type !== "any" && paramFromMethod.type !== "void" && paramFromMethod.type)) {
														const classNameOfTheParam = AcornSyntaxAnalyzer.getClassNameFromSingleAcornNode(param, UIClass);

														if (classNameOfTheParam && classNameOfTheParam !== paramFromMethod.type) {
															const { expectedClass, actualClass } = this._swapClassNames(paramFromMethod.type, classNameOfTheParam);
															const paramFromMethodTypes = expectedClass.split("|");
															const classNamesOfTheParam = actualClass.split("|");
															let typeMismatch = !this._getIfClassNameIntersects(paramFromMethodTypes, classNamesOfTheParam);
															if (typeMismatch) {
																typeMismatch = !paramFromMethodTypes.find(className => {
																	return !!classNamesOfTheParam.find(classNameOfTheParam => {
																		return !this._getIfClassesDiffers(className, classNameOfTheParam)
																	});
																});
															}
															if (typeMismatch) {
																const [className1, className2] = [
																	paramFromMethod.type.includes("__map__") ? "map" : paramFromMethod.type,
																	classNameOfTheParam.includes("__map__") ? "map" : classNameOfTheParam
																];
																const range = RangeAdapter.acornLocationToVSCodeRange(param.loc);
																errors.push({
																	acornNode: param,
																	code: "UI5Plugin",
																	source: "Parameter Linter",
																	message: `"${paramFromMethod.name}" param is of type "${className1}", but provided "${className2}"`,
																	range: range
																});
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

	private _getIfClassesDiffers(expectedClass: string, actualClass: string): boolean {
		let classesDiffers = true;

		({ expectedClass, actualClass } = this._swapClassNames(expectedClass, actualClass));

		if (this._checkIfClassesAreEqual(expectedClass, actualClass, "map", "object")) {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === "any" || actualClass.toLowerCase() === "any") {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === actualClass.toLowerCase()) {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === "object" && UIClassFactory.isClassAChildOfClassB(actualClass, "sap.ui.base.Object")) {
			classesDiffers = false;
		} else if (actualClass.toLowerCase() === "object" && UIClassFactory.isClassAChildOfClassB(expectedClass, "sap.ui.base.Object")) {
			classesDiffers = false;
		} else if (this._checkIfClassesAreEqual(expectedClass, actualClass, "string", "sap.ui.core.csssize")) {
			classesDiffers = false;
		} else if (WrongParametersLinter._sapNodeDAO.findNode(expectedClass)?.getKind() === "enum" && actualClass === "string") {
			classesDiffers = false;
		} else if (WrongParametersLinter._sapNodeDAO.findNode(expectedClass)?.getKind() === "typedef") {
			classesDiffers = this._getIfClassesDiffers("map", actualClass);
		} else {
			classesDiffers = !UIClassFactory.isClassAChildOfClassB(actualClass, expectedClass);
		}

		return classesDiffers;
	}

	private _swapClassNames(expectedClass: string, actualClass: string) {
		expectedClass = this._swapClassName(expectedClass);
		actualClass = this._swapClassName(actualClass);

		if (expectedClass.startsWith("Promise<") && actualClass.startsWith("Promise<")) {
			expectedClass = AcornSyntaxAnalyzer.getResultOfPromise(expectedClass);
			actualClass = AcornSyntaxAnalyzer.getResultOfPromise(actualClass);
		}

		if (expectedClass.endsWith("[]") && actualClass.endsWith("[]")) {
			expectedClass = expectedClass.replace("[]", "");
			actualClass = actualClass.replace("[]", "");
		}

		return { expectedClass, actualClass };
	}

	private _checkIfClassesAreEqual(class1: string, class2: string, substitute1: string, substitute2: string) {
		return class1.toLowerCase() === substitute1 && class2.toLowerCase() === substitute2 ||
			class1.toLowerCase() === substitute2 && class2.toLowerCase() === substitute1;
	}

	private _swapClassName(className: string) {
		const numbers = ["number", "float", "int", "integer"];
		if (className.endsWith("array")) {
			className = "any[]";
		}
		if (className.includes("__map__") || className.includes("__mapparam__")) {
			if (className.endsWith("[]")) {
				className = "map[]";
			} else {
				className = "map";
			}
		}
		if (className === "void" || !className) {
			className = "any";
		}
		if (className === "Promise") {
			className = "Promise<any>";
		}
		if (numbers.includes(className)) {
			className = "number";
		}

		return className;
	}
}