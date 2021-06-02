import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";
import { ReferenceCodeLensGenerator } from "./strategies/ReferenceCodeLensGenerator";

export class JSCodeLensProvider {
	static getCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		return new Promise(resolve => {
			// setTimeout(() => {
			UIClassFactory.setNewContentForClassUsingDocument(document);
			let codeLenses: vscode.CodeLens[] = [];

			const aStrategies = [
				InternalizationTextCodeLenseGenerator,
				OverridenMethodCodeLensGenerator,
				EventHandlerCodeLensGenerator,
				ReferenceCodeLensGenerator
			];
			// console.time("Code lens");
			aStrategies.forEach(Strategy => {
				const strategy = new Strategy();
				codeLenses = strategy.getCodeLenses(document).concat(codeLenses);
			});
			// console.timeEnd("Code lens");

			resolve(codeLenses);
			// copy(JSON.stringify(codeLenses.map(codeLens => codeLens.command.title)))
			// }, 0);
		});
	}
}