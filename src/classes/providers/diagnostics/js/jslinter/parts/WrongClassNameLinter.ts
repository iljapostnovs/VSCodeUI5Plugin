import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { FileReader } from "../../../../../utils/FileReader";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { Util } from "../../../../../utils/Util";
export class WrongClassNameLinter extends Linter {
	protected className = "WrongClassNameLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongClassNameLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
					if (UIClass.acornReturnedClassExtendBody) {
						const classNameFromFile = UIClass.acornReturnedClassExtendBody && UIClass.acornReturnedClassExtendBody.arguments && UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
						if (classNameFromFile && className !== classNameFromFile) {
							const positionBegin = UIClass.acornReturnedClassExtendBody?.arguments[0].start;
							const positionEnd = UIClass.acornReturnedClassExtendBody?.arguments[0].end;
							const range = Util.positionsToVSCodeRange(UIClass.classText, positionBegin, positionEnd);
							if (range) {
								errors.push({
									source: "Class Name Linter",
									acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
									code: "UI5Plugin",
									message: `Invalid class name. Expected: "${className}", actual: "${classNameFromFile}"`,
									range: range
								});
							}
						}
					}
				}
			}
		}

		return errors;
	}
}