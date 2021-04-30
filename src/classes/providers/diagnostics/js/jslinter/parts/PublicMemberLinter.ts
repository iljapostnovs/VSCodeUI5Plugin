import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { FileReader } from "../../../../../utils/FileReader";
import { CustomClassUIField, CustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { AcornSyntaxAnalyzer } from "../../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { ConfigHandler } from "./config/ConfigHandler";
export class PublicMemberLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("usePublicMemberLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const allUIClassesMap = UIClassFactory.getAllExistentUIClasses();
					const allUIClasses = Object.keys(allUIClassesMap).map(key => allUIClassesMap[key]);
					const customUIClasses = allUIClasses.filter(UIClass => UIClass instanceof CustomUIClass) as CustomUIClass[];
					const publicMethods = UIClass.methods.filter(method => method.visibility === "public");
					const publicFields = UIClass.fields.filter(field => field.visibility === "public");
					publicMethods.forEach(method => {
						const isException = this._checkIfMemberIsException(UIClass.className, method.name);
						if (!isException) {
							const methodIsUsed = this._checkIfMemberIsUsedElsewhere(customUIClasses, UIClass, method.name, method);
							if (!methodIsUsed && method.position) {
								const position = LineColumn(UIClass.classText).fromIndex(method.position);
								if (position) {
									errors.push({
										source: "Public member linter",
										acornNode: method.acornNode,
										code: "UI5Plugin",
										message: `Method "${method.name}" is possibly private, no references found in other classes`,
										range: new vscode.Range(
											new vscode.Position(position.line - 1, position.col - 1),
											new vscode.Position(position.line - 1, position.col + method.name.length - 1)
										),
										severity: vscode.DiagnosticSeverity.Information
									});
								}
							}
						}
					});

					publicFields.forEach(field => {
						const isException = this._checkIfMemberIsException(UIClass.className, field.name);
						if (!isException) {
							const fieldIsUsed = this._checkIfMemberIsUsedElsewhere(customUIClasses, UIClass, field.name, field);
							if (!fieldIsUsed && field.memberPropertyNode) {
								const positionBegin = LineColumn(UIClass.classText).fromIndex(field.memberPropertyNode.start);
								const positionEnd = LineColumn(UIClass.classText).fromIndex(field.memberPropertyNode.end);
								if (positionBegin && positionEnd) {
									errors.push({
										source: "Public member linter",
										acornNode: field.acornNode,
										code: "UI5Plugin",
										message: `Field "${field.name}" is possibly private, no references found in other classes`,
										range: new vscode.Range(
											new vscode.Position(positionBegin.line - 1, positionBegin.col - 1),
											new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
										),
										severity: vscode.DiagnosticSeverity.Information
									});
								}
							}
						}
					});
				}
			}
		}

		return errors;
	}

	private _checkIfMemberIsUsedElsewhere(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, memberName: string, fieldOrMethod: CustomClassUIField | CustomClassUIMethod) {
		let isMethodUsedElsewhere = false;

		const isMethodOverriden = UIClassFactory.isMethodOverriden(UIClass.className, memberName);
		if (!isMethodOverriden) {
			const isMethodUsedInOtherClasses = fieldOrMethod.mentionedInTheXMLDocument || this._isMemberUsedInOtherClasses(customUIClasses, UIClass, memberName);
			if (isMethodUsedInOtherClasses) {
				isMethodUsedElsewhere = true;
			}
		} else {
			isMethodUsedElsewhere = true;
		}

		return isMethodUsedElsewhere;
	}

	private _isMemberUsedInOtherClasses(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, memberName: string) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const isMemberUsedInOtherClasses = !!customUIClasses.find(customUIClass => {
			return customUIClass.className !== UIClass.className && !!customUIClass.methods.find(customMethod => {
				let isMemberUsedInOtherClasses = false;
				if (customMethod.acornNode) {
					const content = AcornSyntaxAnalyzer.expandAllContent(customMethod.acornNode);
					const memberExpressions = content.filter((node: any) => {
						return node.type === "MemberExpression" && node.property?.name === memberName;
					});

					if (memberExpressions.length > 0) {
						isMemberUsedInOtherClasses = !!memberExpressions.find((memberExpression: any) => {
							const calleeClassName = strategy.acornGetClassName(customUIClass.className, memberExpression.end, true);

							return calleeClassName && (
								UIClassFactory.isClassAChildOfClassB(calleeClassName, UIClass.className) ||
								UIClassFactory.isClassAChildOfClassB(UIClass.className, calleeClassName)
							);
						});
					}
				}
				return isMemberUsedInOtherClasses;
			});
		});

		return isMemberUsedInOtherClasses;
	}

	private _checkIfMemberIsException(className: string, memberName: string) {
		return ConfigHandler.checkIfMemberIsException(className, memberName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, memberName);
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