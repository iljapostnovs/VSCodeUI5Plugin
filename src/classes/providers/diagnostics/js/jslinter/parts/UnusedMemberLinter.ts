import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { FileReader } from "../../../../../utils/FileReader";
import { CustomClassUIField, CustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { ConfigHandler } from "./config/ConfigHandler";
export class UnusedMemberLinter extends Linter {
	protected className = "UnusedMemberLinter";
	_getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		// console.time("Unused Member Linter");
		if (vscode.workspace.getConfiguration("ui5.plugin").get("useUnusedMemberLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const allUIClassesMap = UIClassFactory.getAllExistentUIClasses();
					const allUIClasses = Object.keys(allUIClassesMap).map(key => allUIClassesMap[key]);
					const customUIClasses = allUIClasses.filter(UIClass => UIClass instanceof CustomUIClass) as CustomUIClass[];
					const methodsAndFields: (CustomClassUIField | CustomClassUIMethod)[] = [
						...UIClass.methods,
						...UIClass.fields
					];
					methodsAndFields.forEach((methodOrField: any) => {
						const methodIsUsed = this._checkIfMethodIsUsed(customUIClasses, UIClass, methodOrField);
						if (!methodIsUsed && methodOrField.memberPropertyNode) {
							const positionBegin = LineColumn(UIClass.classText).fromIndex(methodOrField.memberPropertyNode.start);
							const positionEnd = LineColumn(UIClass.classText).fromIndex(methodOrField.memberPropertyNode.end);
							if (positionBegin && positionEnd) {
								errors.push({
									source: "Unused method Linter",
									acornNode: methodOrField.acornNode,
									code: "UI5Plugin",
									message: `No references found for "${methodOrField.name}" class member`,
									range: new vscode.Range(
										new vscode.Position(positionBegin.line - 1, positionBegin.col - 1),
										new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
									),
									tags: [vscode.DiagnosticTag.Unnecessary],
									severity: vscode.DiagnosticSeverity.Hint
								});
							}
						}
					});
				}
			}
		}
		// console.timeEnd("Unused Method Linter");

		return errors;
	}

	private _checkIfMethodIsUsed(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, methodOrField: CustomClassUIMethod | CustomClassUIField) {
		const isException = this._checkIfMethodIsException(UIClass.className, methodOrField.name);
		let memberIsUsed = false;
		const isMethodOverriden = UIClassFactory.isMethodOverriden(UIClass.className, methodOrField.name);

		if (methodOrField.mentionedInTheXMLDocument || isMethodOverriden) {
			memberIsUsed = true;
		} else if (!isException) {
			const classOfTheMethod = UIClass.className;

			customUIClasses.find(customUIClass => {
				return !!customUIClass.methods.find(methodFromClass => {
					if (methodFromClass.acornNode) {
						const memberExpressions = AcornSyntaxAnalyzer.expandAllContent(methodFromClass.acornNode).filter((node: any) => node.type === "MemberExpression");
						memberExpressions.find((memberExpression: any) => {
							const propertyName = memberExpression.callee?.property?.name || memberExpression?.property?.name;
							const currentMethodIsCalled = propertyName === methodOrField.name;
							if (currentMethodIsCalled) {
								const position = memberExpression.callee?.property?.start || memberExpression?.property?.start;
								const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
								const classNameOfTheCallee = strategy.acornGetClassName(customUIClass.className, position, true);
								if (
									classNameOfTheCallee &&
									(
										classNameOfTheCallee === classOfTheMethod ||
										UIClassFactory.isClassAChildOfClassB(classOfTheMethod, classNameOfTheCallee) ||
										UIClassFactory.isClassAChildOfClassB(classNameOfTheCallee, classOfTheMethod)
									)
								) {
									memberIsUsed = true;
								}
							}

							return memberIsUsed;
						});
					}

					return memberIsUsed;
				});
			});
		} else {
			memberIsUsed = true;
		}

		return memberIsUsed;
	}

	private _checkIfMethodIsException(className: string, methodName: string) {
		return ConfigHandler.checkIfMemberIsException(className, methodName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, methodName);
	}

	private _checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className: string, methodName: string) {
		const startsWith = ["set", "get", "add", "remove", "removeAll", "insert", "indexOf", "destroy", "bind", "unbind"];

		const isStandartMethod = !!startsWith.find(standartMethodStartsWith => {
			let isStandartMethod = false;
			if (methodName.startsWith(standartMethodStartsWith)) {
				const memberNameCapital = methodName.replace(standartMethodStartsWith, "");
				if (memberNameCapital) {
					const memberName = `${memberNameCapital[0].toLowerCase()}${memberNameCapital.substring(1, memberNameCapital.length)}`
					const events = UIClassFactory.getClassEvents(className);
					isStandartMethod = !!events.find(event => event.name === memberName);
					if (!isStandartMethod) {
						const properties = UIClassFactory.getClassProperties(className);
						isStandartMethod = !!properties.find(property => property.name === memberName);
					}
					if (!isStandartMethod) {
						const aggregations = UIClassFactory.getClassAggregations(className);
						isStandartMethod = !!aggregations.find(aggregation => aggregation.name === memberName);
					}
					if (!isStandartMethod) {
						const associations = UIClassFactory.getClassAssociations(className);
						isStandartMethod = !!associations.find(association => association.name === memberName);
					}
				}
			}

			return isStandartMethod;
		});

		return isStandartMethod;
	}
}