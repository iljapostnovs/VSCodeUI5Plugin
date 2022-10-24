import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import Progress from "../../utils/Progress";

export class SwitchToModelCommand {
	static waitFor(ms: number) {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}
	static switchToModel() {
		return Progress.show(async () => {
			const document = vscode.window.activeTextEditor?.document;
			if (document) {
				const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(
					document.fileName
				);
				if (currentClassName) {
					const isController = UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(
						currentClassName,
						"sap.ui.core.mvc.Controller"
					);
					if (isController) {
						const modelName =
							UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(currentClassName);
						if (modelName) {
							const UIModelClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(modelName);
							if (UIModelClass instanceof AbstractCustomClass) {
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
		}, "Switching to model, searching for default model...");
	}

	private static async _switchToModel(modelName: string) {
		const modelFSPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(modelName);
		const editor = vscode.window.activeTextEditor;
		if (editor && modelFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(modelFSPath));
		}
	}
}
