import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { FileReader } from "../../../../../utils/FileReader";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
export class WrongClassNameLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongClassNameLinter")) {
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
									source: "Class Name Linter",
									acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
									code: "UI5Plugin",
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
		}

		return errors;
	}
}