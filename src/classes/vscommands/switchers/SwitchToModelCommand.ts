import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { CustomTSClass } from "../../../typescript/parsing/classes/CustomTSClass";
import { UI5Plugin } from "../../../UI5Plugin";

export class SwitchToModelCommand {
	static async switchToModel() {
		const document = vscode.window.activeTextEditor?.document;
		if (document) {
			const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
			if (currentClassName) {
				const isController = UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(currentClassName, "sap.ui.core.mvc.Controller");
				if (isController) {
					const modelName = UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(currentClassName);
					if (modelName) {
						const UIModelClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(modelName);
						if (UIModelClass instanceof CustomUIClass || UIModelClass instanceof CustomTSClass) {
							await this._switchToModel(UIModelClass.className);
						}
					} else {
						throw new Error(`Default model for "${currentClassName}" controller is not defined`);
					}
				} else {
					throw new Error(`"${currentClassName}" is not a model`);
				}
			}
		}
	}

	private static async _switchToModel(modelName: string) {
		const modelFSPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(modelName);
		const editor = vscode.window.activeTextEditor;
		if (editor && modelFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(modelFSPath));
		}
	}
}