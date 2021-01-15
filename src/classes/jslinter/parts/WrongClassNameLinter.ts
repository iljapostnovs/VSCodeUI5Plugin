import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";
export class WrongClassNameLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
				if (UIClass.acornReturnedClassExtendBody) {
					const classNameFromFile = UIClass.acornReturnedClassExtendBody && UIClass.acornReturnedClassExtendBody.arguments && UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
					if (classNameFromFile && className !== classNameFromFile) {
						const position = LineColumn(UIClass.classText).fromIndex(UIClass.acornReturnedClassExtendBody?.arguments[0].start);
						if (position) {
							errors.push({
								acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
								code: "",
								message: `Invalid class name. Expected: "${className}", actual: "${classNameFromFile}"`,
								range: new vscode.Range(
									new vscode.Position(position.line - 1, position.col),
									new vscode.Position(position.line - 1, position.col + classNameFromFile.length)
								),
							});
						}
					}
				}
			}
		}

		return errors;
	}
}