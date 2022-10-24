import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";

export class SwitchToModelCommand {
	static waitFor(ms: number) {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}
	static async switchToModel() {
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: "UI5Plugin",
				cancellable: false
			},
			async progress => {
				progress.report({
					message: "Switching to model",
					increment: 1
				});
				await this.waitFor(0);
				try {
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
									UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(
										currentClassName
									);
								if (modelName) {
									const UIModelClass =
										UI5Plugin.getInstance().parser.classFactory.getUIClass(modelName);
									if (UIModelClass instanceof AbstractCustomClass) {
										await this._switchToModel(UIModelClass.className);
									}
								} else {
									throw new Error(
										`Default model for "${currentClassName}" controller is not defined`
									);
								}
							} else {
								throw new Error(`"${currentClassName}" is not a model`);
							}
						}
					}
				} catch (oError) {
					progress.report({
						message: "Switching to model",
						increment: 100
					});
				}
			}
		);
	}

	private static async _switchToModel(modelName: string) {
		const modelFSPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(modelName);
		const editor = vscode.window.activeTextEditor;
		if (editor && modelFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(modelFSPath));
		}
	}
}
