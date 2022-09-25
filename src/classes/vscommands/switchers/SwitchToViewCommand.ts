import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { CustomTSClass } from "../../../typescript/parsing/classes/CustomTSClass";
import { UI5Plugin } from "../../../UI5Plugin";

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentClassName = this._getCurrentClassName();
			if (currentClassName) {

				const isModel = UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(currentClassName, "sap.ui.model.Model");
				if (isModel) {
					const allUIClasses = UI5Plugin.getInstance().parser.classFactory.getAllExistentUIClasses();
					const controllers = Object.keys(allUIClasses)
						.filter(key => allUIClasses[key] instanceof CustomUIClass || allUIClasses[key] instanceof CustomTSClass)
						.map(key => <CustomUIClass|CustomTSClass>allUIClasses[key])
						.filter(UIClass => {
							const filePath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(UIClass.className);
							return filePath?.endsWith(".controller.js") || filePath?.endsWith(".controller.ts");
						});

					const controllersWithThisModelInUIDefine = controllers.filter(controller => {
						const bControllerHasThisModelInUIDefine = !!controller.UIDefine.find(UIDefine => UIDefine.classNameDotNotation === currentClassName);
						return bControllerHasThisModelInUIDefine;
					});
					const controllerOfThisModel =
						controllersWithThisModelInUIDefine.find(controller => UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(controller.className) === currentClassName) ||
						controllers.find(controller => UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(controller.className) === currentClassName);
					if (controllerOfThisModel) {
						await this._switchToViewOrFragmentFromUIClass(controllerOfThisModel.className);
					}
				} else {
					await this._switchToViewOrFragmentFromUIClass(currentClassName);
				}

			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async _switchToViewOrFragmentFromUIClass(currentClassName: string) {
		const view = UI5Plugin.getInstance().parser.fileReader.getViewForController(currentClassName);
		if (!view) {
			const fragment = UI5Plugin.getInstance().parser.fileReader.getFirstFragmentForClass(currentClassName);
			if (fragment) {
				await vscode.window.showTextDocument(vscode.Uri.file(fragment.fsPath));
			}
		} else {
			await vscode.window.showTextDocument(vscode.Uri.file(view.fsPath));
		}
	}

	private static _getCurrentClassName() {
		let controllerName: string | undefined;
		const document = vscode.window.activeTextEditor?.document;
		if (document) {
			controllerName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		}
		return controllerName;
	}
}