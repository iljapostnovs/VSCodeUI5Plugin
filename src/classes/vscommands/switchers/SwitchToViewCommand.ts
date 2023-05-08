import { ParserPool } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";

export class SwitchToViewCommand extends ParserBearer {
	async switchToView() {
		try {
			const currentClassName = this._getCurrentClassName();
			if (currentClassName) {
				const isModel = this._parser.classFactory.isClassAChildOfClassB(currentClassName, "sap.ui.model.Model");
				if (isModel) {
					const customClasses = ParserPool.getAllCustomUIClasses();

					const customClassesWithThisModelInUIDefine = customClasses.filter(customClasses => {
						const customClassesHasThisModelInUIDefine = !!customClasses.UIDefine.find(
							UIDefine => UIDefine.classNameDotNotation === currentClassName
						);
						return customClassesHasThisModelInUIDefine;
					});
					const customClassesWithThisDefaultModel = customClasses.filter(customClasses => {
						return customClasses.defaultModelClassName === currentClassName;
					});
					const customClassesOfThisModel =
						customClassesWithThisDefaultModel.find(
							customClasses => customClasses.defaultModelClassName === currentClassName
						) ??
						customClassesWithThisModelInUIDefine.find(
							customClasses =>
								this._parser.classFactory.getDefaultModelForClass(customClasses.className) ===
								currentClassName
						) ??
						customClasses.find(
							customClasses =>
								this._parser.classFactory.getDefaultModelForClass(customClasses.className) ===
								currentClassName
						);
					if (customClassesOfThisModel) {
						await this._switchToXMLFileFromClass(customClassesOfThisModel.className);
					}
				} else {
					await this._switchToXMLFileFromClass(currentClassName);
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	private async _switchToXMLFileFromClass(className: string) {
		const XMLFile: IXMLFile | undefined =
			this._parser.fileReader.getViewForController(className) ??
			this._parser.fileReader.getFirstFragmentForClass(className);

		if (XMLFile) {
			await vscode.window.showTextDocument(vscode.Uri.file(XMLFile.fsPath));
		}
	}

	private _getCurrentClassName() {
		let controllerName: string | undefined;
		const document = vscode.window.activeTextEditor?.document;
		if (document) {
			controllerName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		}
		return controllerName;
	}
}
