import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { FileReader } from "../../../../../utils/FileReader";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";

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
								const position = LineColumn(XMLFile.content).fromIndex(result.index);
								if (position) {
									errors.push({
										code: "UI5Plugin",
										source: "Wrong File Path Linter",
										message: `View or fragment "${sClassName}" doesn't exist`,
										range: new vscode.Range(
											new vscode.Position(position.line - 1, position.col - 1),
											new vscode.Position(position.line - 1, position.col + sClassName.length - 1)
										)
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
		return !!FileReader.getXMLFile(className);
	}
}