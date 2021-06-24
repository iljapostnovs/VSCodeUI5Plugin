import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { FileReader } from "../../../../../utils/FileReader";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";
import * as fs from "fs";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { Util } from "../../../../../utils/Util";

export class WrongFilePathLinter extends Linter {
	protected className = "WrongFilePathLinter";
	getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("useWrongFilePathLinter")) {
			const XMLFile = TextDocumentTransformer.toXMLFile(document);
			if (XMLFile) {
				const manifest = FileReader.getManifestForClass(XMLFile.name);
				if (manifest) {
					const rClassNamesRegex = new RegExp(`${manifest.componentName.replace(/\./, "\\.")}\\..*?(?="|')`, "g");
					if (rClassNamesRegex) {
						let result = rClassNamesRegex.exec(XMLFile.content);
						while (result) {
							const sClassName = result[0];
							const isClassNameValid = this._validateClassName(sClassName);
							if (!isClassNameValid) {
								const range = Util.positionsToVSCodeRange(XMLFile.content, result.index, result.index + sClassName.length);
								if (range) {
									errors.push({
										code: "UI5Plugin",
										source: "Wrong File Path Linter",
										message: `View or fragment "${sClassName}" doesn't exist`,
										range: range
									});
								}
							}

							result = rClassNamesRegex.exec(XMLFile.content);
						}
					}
				}
			}
		}
		return errors;
	}

	private _validateClassName(className: string) {
		let isPathValid = !!FileReader.getXMLFile(className);

		if (!isPathValid) {
			let UIClass = UIClassFactory.getUIClass(className);
			if (UIClass && UIClass instanceof CustomUIClass) {
				isPathValid = UIClass.classExists;

				if (!isPathValid) {
					const parts = className.split(".");
					if (parts.length >= 2) {
						const memberName = parts.pop();
						const className = parts.join(".");
						UIClass = UIClassFactory.getUIClass(className);
						if (UIClass.classExists) {
							isPathValid = !!UIClass.methods.find(method => method.name === memberName) || !!UIClass.fields.find(field => field.name === memberName);
						}
					}
				}
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