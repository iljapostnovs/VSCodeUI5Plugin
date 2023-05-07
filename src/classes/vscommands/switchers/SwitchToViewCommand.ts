import { ParserPool } from "ui5plugin-parser";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";

export class SwitchToViewCommand extends ParserBearer {
	async switchToView() {
		try {
			const currentClassName = this._getCurrentClassName();
			if (currentClassName) {
				const isModel = this._parser.classFactory.isClassAChildOfClassB(currentClassName, "sap.ui.model.Model");
				if (isModel) {
					const allUIClasses = ParserPool.getAllExistentUIClasses();
					const controllers = Object.keys(allUIClasses)
						.filter(key => allUIClasses[key] instanceof AbstractCustomClass)
						.map(key => <AbstractCustomClass>allUIClasses[key])
						.filter(UIClass => {
							const filePath = this._parser.fileReader.getClassFSPathFromClassName(UIClass.className);
							return filePath?.endsWith(".controller.js") || filePath?.endsWith(".controller.ts");
						});

					const controllersWithThisModelInUIDefine = controllers.filter(controller => {
						const bControllerHasThisModelInUIDefine = !!controller.UIDefine.find(
							UIDefine => UIDefine.classNameDotNotation === currentClassName
						);
						return bControllerHasThisModelInUIDefine;
					});
					const controllersWithThisDefaultModel = controllers.filter(controller => {
						return controller.defaultModelClassName === currentClassName;
					});
					const controllerOfThisModel =
						controllersWithThisDefaultModel.find(
							controller => controller.defaultModelClassName === currentClassName
						) ??
						controllersWithThisModelInUIDefine.find(
							controller =>
								this._parser.classFactory.getDefaultModelForClass(controller.className) ===
								currentClassName
						) ??
						controllers.find(
							controller =>
								this._parser.classFactory.getDefaultModelForClass(controller.className) ===
								currentClassName
						);
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

	private async _switchToViewOrFragmentFromUIClass(currentClassName: string) {
		const view = this._parser.fileReader.getViewForController(currentClassName);
		if (!view) {
			const fragment = this._parser.fileReader.getFirstFragmentForClass(currentClassName);
			if (fragment) {
				await vscode.window.showTextDocument(vscode.Uri.file(fragment.fsPath));
			}
		} else {
			await vscode.window.showTextDocument(vscode.Uri.file(view.fsPath));
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
