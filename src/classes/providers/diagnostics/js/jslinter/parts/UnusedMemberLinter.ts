import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { FileReader } from "../../../../../utils/FileReader";
import { ICustomClassUIField, ICustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { ConfigHandler } from "./config/ConfigHandler";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
import { ReferenceCodeLensGenerator } from "../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
export class UnusedMemberLinter extends Linter {
	protected className = "UnusedMemberLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		// console.time("Unused Member Linter");
		if (vscode.workspace.getConfiguration("ui5.plugin").get("useUnusedMemberLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const methodsAndFields: (ICustomClassUIField | ICustomClassUIMethod)[] = [
						...UIClass.methods,
						...UIClass.fields
					];
					methodsAndFields.forEach((methodOrField: any) => {
						const methodIsUsed = this._checkIfMemberIsUsed(UIClass, methodOrField);
						if (!methodIsUsed && methodOrField.memberPropertyNode) {
							const range = RangeAdapter.acornLocationToVSCodeRange(methodOrField.memberPropertyNode.loc);
							errors.push({
								source: "Unused method Linter",
								acornNode: methodOrField.acornNode,
								code: "UI5Plugin",
								message: `No references found for "${methodOrField.name}" class member`,
								range: range,
								tags: [vscode.DiagnosticTag.Unnecessary],
								severity: vscode.DiagnosticSeverity.Hint
							});
						}
					});
				}
			}
		}
		// console.timeEnd("Unused Method Linter");

		return errors;
	}

	private _checkIfMemberIsUsed(UIClass: CustomUIClass, member: ICustomClassUIMethod | ICustomClassUIField) {
		let memberIsUsed =
			member.ui5ignored ||
			member.mentionedInTheXMLDocument ||
			UIClassFactory.isMethodOverriden(UIClass.className, member.name) ||
			this._checkIfMethodIsException(UIClass.className, member.name);

		if (!memberIsUsed) {
			const referenceCodeLens = new ReferenceCodeLensGenerator();
			const references = referenceCodeLens.getReferenceLocations(member);
			memberIsUsed = references.length > 0;
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