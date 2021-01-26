import * as vscode from "vscode";
import {ResourceModelData} from "../../../../UI5Classes/ResourceModelData";
import {FileReader} from "../../../../utils/FileReader";
import {CodeLensGenerator} from "./abstraction/CodeLensGenerator";

export class InternalizationTextCodeLenseGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		return this._generateInternalizationCodeLenses(document);
	}

	private _generateInternalizationCodeLenses(document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];

		const componentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
		if (componentName && document) {
			const currentResourceModelTexts = ResourceModelData.resourceModels[componentName];
			const XMLText = document.getText();

			const rTranslatedTexts = /(?<=\.getText\()".*"/g;
			let results = rTranslatedTexts.exec(XMLText);
			while (results) {
				results = results || [];
				if (results && results[0]) {
					results[0] = results[0].substring(1, results[0].length - 1); //crop ""
				}
				const positionBegin = document.positionAt(results.index + 1);
				const positionEnd = document.positionAt(results.index + results[0].length);
				const range = new vscode.Range(positionBegin, positionEnd);

				if (results[0]) {
					results[0] = `{i18n>${results[0]}}`;
				}
				const currentText = currentResourceModelTexts.find(text => text.text === (results || [])[0]);
				if (currentText) {
					const codeLens = new vscode.CodeLens(range, {
						command: "ui5plugin.gotoresourcemodel",
						tooltip: currentText?.description || "",
						arguments: [/(?<=\{i18n>).*?(?=\})/.exec(currentText?.text || "")],
						title: currentText?.description || ""
					});

					codeLenses.push(codeLens);
				}
				results = rTranslatedTexts.exec(XMLText);
			}
		}

		return codeLenses;
	}

}