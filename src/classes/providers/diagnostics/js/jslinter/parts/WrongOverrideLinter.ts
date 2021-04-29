import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomClassUIField, CustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { AbstractUIClass, UIField, UIMethod } from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
export class WrongOverrideLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongOverrideLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const fieldsAndMethods = [
						...UIClass.fields,
						...UIClass.methods
					];
					fieldsAndMethods.forEach(fieldOrMethod => {
						const error = this._getIfMemberIsWronglyOverriden(UIClass, fieldOrMethod);
						if (error) {
							errors.push(error);
						}
					});
				}
			}
		}

		return errors;
	}

	private _getIfMemberIsWronglyOverriden(UIClass: CustomUIClass, UIMember: CustomClassUIMethod | CustomClassUIField) {
		let error: Error | undefined;
		const parentMember = this._getMemberFromParent(UIClass, UIMember);
		if (parentMember && parentMember.visibility === "private" && UIMember.memberPropertyNode) {
			const positionStart = LineColumn(UIClass.classText).fromIndex(UIMember.memberPropertyNode.start);
			const positionEnd = LineColumn(UIClass.classText).fromIndex(UIMember.memberPropertyNode.end);
			if (positionStart && positionEnd) {
				error = {
					message: `You can't override "${UIMember.name}" because it is a private member of class "${parentMember.owner}"`,
					code: "UI5Plugin",
					source: "Wrong Override Linter",
					range: new vscode.Range(
						new vscode.Position(positionStart.line - 1, positionStart.col - 1),
						new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
					),
					acornNode: UIMember.acornNode,
					methodName: UIMember.name,
					sourceClassName: UIClass.className,
					severity: vscode.DiagnosticSeverity.Error
				};
			}
		}

		return error;
	}

	private _getMemberFromParent(UIClass: AbstractUIClass, UIMember: UIMethod | CustomClassUIField): UIMethod | UIField | undefined {
		let parentMember: UIMethod | UIField | undefined;
		if (UIClass.parentClassNameDotNotation) {
			const UIClassParent = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			const fieldsAndMethods = [
				...UIClassParent.fields,
				...UIClassParent.methods
			];
			parentMember = fieldsAndMethods.find(parentMember => parentMember.name === UIMember.name);
			if (!parentMember && UIClassParent.parentClassNameDotNotation) {
				parentMember = this._getMemberFromParent(UIClassParent, UIMember);
			}
		}

		return parentMember;
	}
}