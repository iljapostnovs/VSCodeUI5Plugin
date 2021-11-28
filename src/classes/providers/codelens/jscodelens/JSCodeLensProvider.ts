import * as vscode from "vscode";
import { UI5Plugin } from "../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";
import { ReferenceCodeLensGenerator } from "./strategies/ReferenceCodeLensGenerator";

export class JSCodeLensProvider {
	static async getCodeLenses(document: vscode.TextDocument) {
		UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
		const codeLenses: vscode.CodeLens[] = [];

		const aStrategies = [
			InternalizationTextCodeLenseGenerator,
			OverridenMethodCodeLensGenerator,
			EventHandlerCodeLensGenerator,
			ReferenceCodeLensGenerator
		];
		aStrategies.forEach(Strategy => {
			const strategy = new Strategy();
			codeLenses.push(...strategy.getCodeLenses(document));
		});

		// copy(JSON.stringify(codeLenses.map(codelens => codelens.command.title)))
		return codeLenses;
	}
}