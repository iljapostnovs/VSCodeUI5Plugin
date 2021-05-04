import * as vscode from "vscode";
import { UIClassFactory } from "../../../../../../UI5Classes/UIClassFactory";
export class ConfigHandler {
	private static _cache: { [key: string]: boolean } = {}
	static getJSLinterExceptions(): Array<{ className: string; memberName: string; applyToChildren: boolean }> {
		return vscode.workspace.getConfiguration("ui5.plugin").get("JSLinterExceptions") || [];
	}

	static checkIfMemberIsException(className = "", memberName = "") {
		const cacheKey = [className, memberName].join(",");

		if (!this._cache[cacheKey]) {
			const hardcodedExceptions = ["metadata", "renderer", "onAfterRendering", "customMetadata"];
			const classExceptions = ConfigHandler.getJSLinterExceptions();
			const isException = hardcodedExceptions.includes(memberName) || !!classExceptions.find(classException => {
				let isException = (classException.className === className || classException.className === "*") &&
					(classException.memberName === memberName || classException.memberName === "*");

				if (!isException && classException.applyToChildren && (classException.memberName === memberName || classException.memberName === "*")) {
					isException = UIClassFactory.isClassAChildOfClassB(className, classException.className);
				}

				if (!isException) {
					isException = this._checkIfMemberIsEventHandler(memberName);
				}

				return isException;
			});

			this._cache[cacheKey] = isException;
		}

		return this._cache[cacheKey];
	}

	private static _checkIfMemberIsEventHandler(memberName: string) {
		if (memberName.length <= 3) {
			return false;
		}

		const chars = memberName.split("");
		const firstChars = chars.splice(0, 2).join("");
		const memberNameStartsWithOn = firstChars === "on";
		const restCharsAreLowerCase = chars.every(char => char.toLowerCase() === char);

		const isDomEventHandler = memberNameStartsWithOn && restCharsAreLowerCase;

		return isDomEventHandler;
	}
}