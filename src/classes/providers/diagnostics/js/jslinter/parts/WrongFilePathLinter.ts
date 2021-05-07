import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../../utils/FileReader";
import * as fs from "fs";

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
									const position = LineColumn(UIClass.classText).fromIndex(result.index);
									if (position) {
										errors.push({
											acornNode: UIClass.acornClassBody,
											code: "UI5Plugin",
											source: "Wrong File Path Linter",
											message: `Class "${sClassName}" doesn't exist`,
											range: new vscode.Range(
												new vscode.Position(position.line - 1, position.col - 1),
												new vscode.Position(position.line - 1, position.col + sClassName.length - 1)
											)
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

	private _validateClassName(sFilePath: string) {
		let isPathValid = false;
		const UIClass = UIClassFactory.getUIClass(sFilePath);
		if (UIClass && UIClass instanceof CustomUIClass) {
			isPathValid = UIClass.classExists;
		}

		if (!isPathValid) {
			const sFileFSPath = FileReader.convertClassNameToFSPath(sFilePath, false, false, true);
			const aAllViews = FileReader.getAllViews();
			const oView = aAllViews.find(oView => oView.fsPath === sFileFSPath);
			isPathValid = !!oView;
		}

		if (!isPathValid) {
			const sFileFSPath = FileReader.convertClassNameToFSPath(sFilePath, false, true, false);
			const aAllFragments = FileReader.getAllFragments();
			const oFragment = aAllFragments.find(oFragment => oFragment.fsPath === sFileFSPath);
			isPathValid = !!oFragment;
		}

		if (!isPathValid) {
			if (sFilePath.endsWith(".")) {
				sFilePath = sFilePath.substring(0, sFilePath.length - 1);
			}
			const sFileFSPath = FileReader.convertClassNameToFSPath(sFilePath)?.replace(".js", ".properties");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		if (!isPathValid) {
			if (sFilePath.endsWith(".")) {
				sFilePath = sFilePath.substring(0, sFilePath.length - 1);
			}
			const sFileFSPath = FileReader.convertClassNameToFSPath(sFilePath)?.replace(".js", "");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		return isPathValid;
	}
}