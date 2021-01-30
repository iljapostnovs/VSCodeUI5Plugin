import {Error, Linter} from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import {FileReader} from "../../../../../utils/FileReader";
import {CustomClassUIMethod, CustomUIClass} from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import {UIClassFactory} from "../../../../../UI5Classes/UIClassFactory";
import {AcornSyntaxAnalyzer} from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import {FieldsAndMethodForPositionBeforeCurrentStrategy} from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import {ConfigHandler} from "./config/ConfigHandler";
export class UnusedMethodLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		// console.time("Unused Method Linter");
		if (vscode.workspace.getConfiguration("ui5.plugin").get("useUnusedMethodLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const allUIClassesMap = UIClassFactory.getAllExistentUIClasses();
					const allUIClasses = Object.keys(allUIClassesMap).map(key => allUIClassesMap[key]);
					const customUIClasses = allUIClasses.filter(UIClass => UIClass instanceof CustomUIClass) as CustomUIClass[];
					UIClass.methods.forEach(method => {
						const methodIsUsed = this._checkIfMethodIsUsed(customUIClasses, UIClass, method);
						if (!methodIsUsed && method.position) {
							const position = LineColumn(UIClass.classText).fromIndex(method.position);
							if (position) {
								errors.push({
									source: "Unused method Linter",
									acornNode: method.acornNode,
									code: "UI5Plugin",
									message: `No references found for "${method.name}" class member`,
									range: new vscode.Range(
										new vscode.Position(position.line - 1, position.col - 1),
										new vscode.Position(position.line - 1, position.col + method.name.length - 1)
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

	private _checkIfMethodIsUsed(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, method: CustomClassUIMethod) {
		const isException = this._checkIfMethodIsException(UIClass.className, method.name);
		let methodIsUsed = false;
		let isMethodOverriden = false;

		if (UIClass.parentClassNameDotNotation) {
			const allMethods = UIClassFactory.getFieldsAndMethodsForClass(UIClass.parentClassNameDotNotation).methods;
			const sameMethod = allMethods.find(methodFromParent => {
				return methodFromParent.name === method.name;
			});

			isMethodOverriden = !!sameMethod;
		}

		if (method.isEventHandler || method.mentionedInTheXMLDocument || isMethodOverriden) {
			methodIsUsed = true;
		} else if (!isException) {
			const classOfTheMethod = UIClass.className;

			customUIClasses.find(customUIClass => {
				return !!customUIClass.methods.find(methodFromClass => {
					if (methodFromClass.acornNode) {
						const expressions = AcornSyntaxAnalyzer.expandAllContent(methodFromClass.acornNode).filter((node: any) => node.type === "MemberExpression");
						expressions.find((expression: any) => {
							const propertyName = expression.callee?.property?.name || expression?.property?.name;
							const currentMethodIsCalled = propertyName === method.name;
							if (currentMethodIsCalled) {
								const position = expression.callee?.property?.start || expression?.property?.start;
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
									methodIsUsed = true;
								}
							}

							return methodIsUsed;
						});
					}

					return methodIsUsed;
				});
			});
		} else {
			methodIsUsed = true;
		}

		return methodIsUsed;
	}

	private _checkIfMethodIsException(className: string, methodName: string) {
		return ConfigHandler.checkIfMethodNameIsException(className, methodName) ||
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