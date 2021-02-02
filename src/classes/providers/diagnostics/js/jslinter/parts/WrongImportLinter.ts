import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
export class WrongImportLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongImportLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.UIDefine) {
					UIClass.UIDefine.forEach(UIDefine => {
						const UIDefineClass = UIClassFactory.getUIClass(UIDefine.classNameDotNotation);
						if (!UIDefineClass.classExists) {
							const position = LineColumn(UIClass.classText).fromIndex(UIDefine.start);
							if (position) {
								errors.push({
									acornNode: UIDefine.acornNode,
									code: "UI5Plugin",
									source: "Import path Linter",
									message: `Class "${UIDefine.classNameDotNotation}" doesn't exist`,
									range: new vscode.Range(
										new vscode.Position(position.line - 1, position.col),
										new vscode.Position(position.line - 1, position.col + UIDefine.path.length)
									)
								});
							}
						}
					});
				}
			}
		}
		return errors;
	}
}