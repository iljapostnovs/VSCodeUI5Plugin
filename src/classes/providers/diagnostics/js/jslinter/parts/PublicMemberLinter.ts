import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { FileReader } from "../../../../../utils/FileReader";
import { ICustomClassUIField, ICustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { ConfigHandler } from "./config/ConfigHandler";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
import { ReferenceCodeLensGenerator } from "../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
export class PublicMemberLinter extends Linter {
	protected className = "PublicMemberLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("usePublicMemberLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const publicMethods = UIClass.methods.filter(method => method.visibility === "public");
					const publicFields = UIClass.fields.filter(field => field.visibility === "public");
					publicMethods.forEach(method => {
						const isException = this._checkIfMemberIsException(UIClass.className, method.name);
						if (!isException) {
							const methodIsUsed = this._checkIfMemberIsUsedElsewhere(UIClass, method);
							if (!methodIsUsed && method.position) {
								const range = RangeAdapter.acornLocationToVSCodeRange(method.memberPropertyNode.loc);
								errors.push({
									source: "Public member linter",
									acornNode: method.acornNode,
									code: "UI5Plugin",
									message: `Method "${method.name}" is possibly private, no references found in other classes`,
									range: range,
									severity: vscode.DiagnosticSeverity.Information
								});
							}
						}
					});

					publicFields.forEach(field => {
						const isException = this._checkIfMemberIsException(UIClass.className, field.name);
						if (!isException) {
							const fieldIsUsed = this._checkIfMemberIsUsedElsewhere(UIClass, field);
							if (!fieldIsUsed && field.memberPropertyNode) {
								const range = RangeAdapter.acornLocationToVSCodeRange(field.memberPropertyNode.loc);
								errors.push({
									source: "Public member linter",
									acornNode: field.acornNode,
									code: "UI5Plugin",
									message: `Field "${field.name}" is possibly private, no references found in other classes`,
									range: range,
									severity: vscode.DiagnosticSeverity.Information
								});
							}
						}
					});
				}
			}
		}

		return errors;
	}

	private _checkIfMemberIsUsedElsewhere(UIClass: CustomUIClass, member: ICustomClassUIField | ICustomClassUIMethod) {
		//TODO: Sync with Unused member linter
		let memberIsUsed =
			member.ui5ignored ||
			member.mentionedInTheXMLDocument ||
			UIClassFactory.isMethodOverriden(UIClass.className, member.name) ||
			this._checkIfMemberIsException(UIClass.className, member.name);

		if (!memberIsUsed) {
			const referenceCodeLens = new ReferenceCodeLensGenerator();
			const references = referenceCodeLens.getReferenceLocations(member).filter(reference => {
				return reference.uri.fsPath !== UIClass.classFSPath;
			});
			memberIsUsed = references.length > 0;
		}

		return memberIsUsed;
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