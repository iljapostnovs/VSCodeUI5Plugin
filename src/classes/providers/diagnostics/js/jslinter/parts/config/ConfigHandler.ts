import * as vscode from "vscode";
import { UIClassFactory } from "../../../../../../UI5Classes/UIClassFactory";
export class ConfigHandler {
	static getJSLinterExceptions(): Array<{ className: string; memberName: string; applyToChildren: boolean }> {
		return vscode.workspace.getConfiguration("ui5.plugin").get("JSLinterExceptions") || [];
	}

	static checkIfMemberIsException(className = "", memberName = "") {
		const hardcodedExceptions = ["metadata"];
		const classExceptions = ConfigHandler.getJSLinterExceptions();
		const isException = hardcodedExceptions.includes(memberName) || !!classExceptions.find(classException => {
			let isException = (classException.className === className || classException.className === "*") &&
				(classException.memberName === memberName || classException.memberName === "*");

			if (!isException && classException.applyToChildren && (classException.memberName === memberName || classException.memberName === "*")) {
				isException = UIClassFactory.isClassAChildOfClassB(className, classException.className);
			}

			return isException;
		});

		return isException;
	}
}