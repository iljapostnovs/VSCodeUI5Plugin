import * as vscode from "vscode";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";

export class SwitchToModelCommand {
	static async switchToModel() {
		const document = vscode.window.activeTextEditor?.document;
		if (document) {
			const currentClassName = FileReader.getClassNameFromPath(document.fileName);
			if (currentClassName) {
				const isController = UIClassFactory.isClassAChildOfClassB(currentClassName, "sap.ui.core.mvc.Controller");
				if (isController) {
					const modelName = UIClassFactory.getDefaultModelForClass(currentClassName);
					if (modelName) {
						const UIModelClass = UIClassFactory.getUIClass(modelName);
						if (UIModelClass instanceof CustomUIClass) {
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
		const modelFSPath = FileReader.getClassFSPathFromClassName(modelName);
		const editor = vscode.window.activeTextEditor;
		if (editor && modelFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(modelFSPath));
		}
	}
}