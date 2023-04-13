import { UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { EventHandlerCodeLensGenerator } from "./strategies/EventHandlerCodeLensGenerator";
import { InternalizationTextCodeLenseGenerator } from "./strategies/InternalizationTextCodeLenseGenerator";
import { OverridenMethodCodeLensGenerator } from "./strategies/OverridenMethodCodeLensGenerator";
import { ReferenceCodeLensGenerator } from "./strategies/ReferenceCodeLensGenerator";

export class JSCodeLensProvider extends ParserBearer<UI5JSParser> {
	async getCodeLenses(document: vscode.TextDocument) {
		this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
		const codeLenses: vscode.CodeLens[] = [];

		const aStrategies = [
			InternalizationTextCodeLenseGenerator,
			OverridenMethodCodeLensGenerator,
			EventHandlerCodeLensGenerator,
			ReferenceCodeLensGenerator
		];
		aStrategies.forEach(Strategy => {
			const strategy = new Strategy(this._parser);
			codeLenses.push(...strategy.getCodeLenses(document));
		});

		// copy(JSON.stringify(codeLenses.map(codelens => codelens.command.title)))
		return codeLenses;
	}
}
