import * as vscode from "vscode";
import { CodeLensGenerator } from "./strategies/abstraction/CodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";

export class JSCodeLensProvider {
	static getCodeLenses() : Promise<vscode.CodeLens[]> {
		return new Promise(resolve => {
			let codeLenses: vscode.CodeLens[] = [];

			const aStrategies = [
				InternalizationTextCodeLenseGenerator,
				OverridenMethodCodeLensGenerator
			];
			setTimeout(() => {
				aStrategies.forEach(Strategy => {
					const strategy = new Strategy();
					codeLenses = strategy.getCodeLenses().concat(codeLenses);
				});

				resolve(codeLenses);
			}, 200);
		});
	}


}