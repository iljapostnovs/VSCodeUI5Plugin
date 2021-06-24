import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { ICustomClassUIField, ICustomClassUIMethod, CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { AbstractUIClass, IUIField, IUIMethod } from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { Util } from "../../../../../utils/Util";
export class WrongOverrideLinter extends Linter {
	protected className = "WrongOverrideLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

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

	private _getIfMemberIsWronglyOverriden(UIClass: CustomUIClass, UIMember: ICustomClassUIMethod | ICustomClassUIField) {
		let error: IError | undefined;
		const parentMember = this._getMemberFromParent(UIClass, UIMember);
		if (parentMember && parentMember.visibility === "private" && UIMember.memberPropertyNode) {
			const range = Util.positionsToVSCodeRange(UIClass.classText, UIMember.memberPropertyNode.start, UIMember.memberPropertyNode.end);
			if (range) {
				error = {
					message: `You can't override "${UIMember.name}" because it is a private member of class "${parentMember.owner}"`,
					code: "UI5Plugin",
					source: "Wrong Override Linter",
					range: range,
					acornNode: UIMember.acornNode,
					methodName: UIMember.name,
					sourceClassName: UIClass.className,
					severity: vscode.DiagnosticSeverity.Error
				};
			}
		}

		return error;
	}

	private _getMemberFromParent(UIClass: AbstractUIClass, UIMember: IUIMethod | ICustomClassUIField): IUIMethod | IUIField | undefined {
		let parentMember: IUIMethod | IUIField | undefined;
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