import * as vscode from "vscode";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentClassName = this._getCurrentClassName();
			if (currentClassName) {

				const isModel = UIClassFactory.isClassAChildOfClassB(currentClassName, "sap.ui.model.Model");
				if (isModel) {
					const allUIClasses = UIClassFactory.getAllExistentUIClasses();
					const controllers = Object.keys(allUIClasses)
						.filter(key => allUIClasses[key] instanceof CustomUIClass)
						.map(key => <CustomUIClass>allUIClasses[key])
						.filter(UIClass => FileReader.getClassPathFromClassName(UIClass.className)?.endsWith(".controller.js"));
					const controllerOfThisModel = controllers.find(controller => UIClassFactory.getDefaultModelForClass(controller.className) === currentClassName);
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
		const view = FileReader.getViewForController(currentClassName);
		if (!view) {
			const fragment = FileReader.getFirstFragmentForClass(currentClassName);
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
			controllerName = FileReader.getClassNameFromPath(document.fileName);
		}
		return controllerName;
	}
}