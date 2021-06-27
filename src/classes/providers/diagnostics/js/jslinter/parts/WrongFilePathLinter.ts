import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import * as fs from "fs";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";

export class WrongFilePathLinter extends Linter {
	protected className = "WrongFilePathLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongFilePathLinter")) {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.classText) {
					const manifest = FileReader.getManifestForClass(UIClass.className);
					if (manifest) {
						const rClassNamesRegex = new RegExp(`${manifest.componentName.replace(/\./, "\\.")}\\..*?(?="|')`, "g");
						if (rClassNamesRegex) {
							let result = rClassNamesRegex.exec(UIClass.classText);
							while (result) {
								const sClassName = result[0];
								const isClassNameValid = this._validateClassName(sClassName);
								if (!isClassNameValid) {
									const positionBegin = result.index;
									const positionEnd = positionBegin + sClassName.length;
									const range = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, positionBegin, positionEnd);
									if (range) {
										errors.push({
											acornNode: UIClass.acornClassBody,
											code: "UI5Plugin",
											source: "Wrong File Path Linter",
											message: `Class "${sClassName}" doesn't exist`,
											range: range
										});
									}
								}

								result = rClassNamesRegex.exec(UIClass.classText);
							}
						}
					}
				}
			}
		}
		return errors;
	}

	private _validateClassName(className: string) {
		let isPathValid = false;
		const UIClass = UIClassFactory.getUIClass(className);
		if (UIClass && UIClass instanceof CustomUIClass) {
			isPathValid = UIClass.classExists;
		}

		if (!isPathValid) {
			const sFileFSPath = FileReader.convertClassNameToFSPath(className, false, false, true);
			const aAllViews = FileReader.getAllViews();
			const oView = aAllViews.find(oView => oView.fsPath === sFileFSPath);
			isPathValid = !!oView;
		}

		if (!isPathValid) {
			const sFileFSPath = FileReader.convertClassNameToFSPath(className, false, true, false);
			const aAllFragments = FileReader.getAllFragments();
			const oFragment = aAllFragments.find(oFragment => oFragment.fsPath === sFileFSPath);
			isPathValid = !!oFragment;
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = FileReader.convertClassNameToFSPath(className)?.replace(".js", ".properties");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = FileReader.convertClassNameToFSPath(className)?.replace(".js", "");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		return isPathValid;
	}
}