import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";

export class JSCodeLensProvider {
	static getCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		return new Promise(resolve => {
			// setTimeout(() => {
			UIClassFactory.setNewContentForClassUsingDocument(document);
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
			// }, 0);
		});
	}
}