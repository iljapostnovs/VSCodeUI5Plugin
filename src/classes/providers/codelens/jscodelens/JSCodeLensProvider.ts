import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";
import { ReferenceCodeLensGenerator } from "./strategies/ReferenceCodeLensGenerator";

export class JSCodeLensProvider {
	static async getCodeLenses(document: vscode.TextDocument) {
		// setTimeout(() => {
		UIClassFactory.setNewContentForClassUsingDocument(document);
		const codeLenses: vscode.CodeLens[] = [];

		const aStrategies = [
			InternalizationTextCodeLenseGenerator,
			OverridenMethodCodeLensGenerator,
			EventHandlerCodeLensGenerator,
			ReferenceCodeLensGenerator
		];
		// console.time("Code lens");
		aStrategies.forEach(Strategy => {
			const strategy = new Strategy();
			codeLenses.push(...strategy.getCodeLenses(document));
		});
		// console.timeEnd("Code lens");

		return codeLenses;
	}
}