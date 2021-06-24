import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import { Util } from "../../../../../utils/Util";
export class WrongImportLinter extends Linter {
	protected className = "WrongImportLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongImportLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.UIDefine) {
					UIClass.UIDefine.forEach(UIDefine => {
						const UIDefineClass = UIClassFactory.getUIClass(UIDefine.classNameDotNotation);
						if (!UIDefineClass.classExists) {
							const range = Util.positionsToVSCodeRange(UIClass.classText, UIDefine.start, UIDefine.start + UIDefine.path.length);
							if (range) {
								errors.push({
									acornNode: UIDefine.acornNode,
									code: "UI5Plugin",
									source: "Import path Linter",
									message: `Class "${UIDefine.classNameDotNotation}" doesn't exist`,
									range: range
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