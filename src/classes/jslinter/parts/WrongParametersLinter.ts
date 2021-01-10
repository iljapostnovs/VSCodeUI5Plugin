import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
export class WrongParametersLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];
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
										const methodParams = method.params;
										const mandatoryMethodParams = methodParams.filter(param => !param.isOptional);
										if (params.length < mandatoryMethodParams.length || params.length > methodParams.length) {
											const positionStart = LineColumn(UIClass.classText).fromIndex(call.callee.property.start);
											const positionEnd = LineColumn(UIClass.classText).fromIndex(call.callee.property.end);
											if (positionStart && positionEnd) {
												errors.push({
													acornNode: call,
													code: "",
													message: `Method "${methodName}" has ${methodParams.length} param(s), but you provided ${params.length}`,
													range: new vscode.Range(
														new vscode.Position(positionStart.line - 1, positionStart.col - 1),
														new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
													),
												});
											}
										}
									}
								}
							}
						}
					});
				});
			}
		}

		return errors;
	}
}