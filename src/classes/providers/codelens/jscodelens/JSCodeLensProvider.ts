import * as vscode from "vscode";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";

export class JSCodeLensProvider {
	static getCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		return new Promise(resolve => {
			setTimeout(() => {
				this._setNewCodeForClassIfItIsChanged(document);
				let codeLenses: vscode.CodeLens[] = [];

				const aStrategies = [
					InternalizationTextCodeLenseGenerator,
					OverridenMethodCodeLensGenerator,
					EventHandlerCodeLensGenerator
				];
				aStrategies.forEach(Strategy => {
					const strategy = new Strategy();
					codeLenses = strategy.getCodeLenses(document).concat(codeLenses);
				});

				resolve(codeLenses);
			}, 0);
		});
	}

	private static _setNewCodeForClassIfItIsChanged(document: vscode.TextDocument) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			if (UIClass.classText.length !== document.getText().length) {
				UIClassFactory.setNewCodeForClass(className, document.getText());
			}
		}
	}
}