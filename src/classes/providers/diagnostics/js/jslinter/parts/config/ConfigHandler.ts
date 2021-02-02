import * as vscode from "vscode";
export class ConfigHandler {
	static getJSLinterExceptions(): Array<{ className: string; memberName: string }> {
		return vscode.workspace.getConfiguration("ui5.plugin").get("JSLinterExceptions") || [];
	}

	static checkIfMethodNameIsException(className = "", memberName = "") {
		const classExceptions = ConfigHandler.getJSLinterExceptions();
		const isException = !!classExceptions.find(classException =>
			(classException.className === className || classException.className === "*") &&
			(classException.memberName === memberName || classException.memberName === "*")
		);

		return isException;
	}
}