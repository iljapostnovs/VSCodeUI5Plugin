import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSDefinitionProvider } from "../providers/definitions/js/JSDefinitionProvider";
import { XMLDefinitionProvider } from "../providers/definitions/xml/XMLDefinitionProvider";

export class DefinitionProviderRegistrator {
	static register() {
		/* Definition provider */
		const definitionProviderDisposable = vscode.languages.registerDefinitionProvider(
			{ language: "javascript", scheme: "file" },
			{
				provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5JSParser) {
						return new JSDefinitionProvider(parser).getPositionAndUriOfCurrentVariableDefinition(
							document,
							position,
							false
						);
					}
				}
			}
		);
		const typeDefinitionProviderDisposable = vscode.languages.registerTypeDefinitionProvider(
			{ language: "javascript", scheme: "file" },
			{
				provideTypeDefinition(document: vscode.TextDocument, position: vscode.Position) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5JSParser) {
						return new JSDefinitionProvider(parser).getPositionAndUriOfCurrentVariableDefinition(
							document,
							position,
							true
						);
					}
				}
			}
		);
		const XMLDefinitionProviderDisposable = vscode.languages.registerDefinitionProvider(
			{ language: "xml", scheme: "file" },
			{
				provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser) {
						return new XMLDefinitionProvider(parser).provideDefinitionsFor(document, position);
					}
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(definitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(typeDefinitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(XMLDefinitionProviderDisposable);
	}
}
