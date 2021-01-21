import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { UIClassDefinitionFinder } from "../providers/definitions/js/UIClassDefinitionFinder";
import { XMLDefinitionProvider } from "../providers/definitions/xml/XMLDefinitionProvider";

export class DefinitionProviderRegistrator {
	static register() {
		/* Definition provider */
		const definitionProviderDisposable = vscode.languages.registerDefinitionProvider({language: "javascript", scheme: "file"}, {
			provideDefinition() {
				return UIClassDefinitionFinder.getPositionAndUriOfCurrentVariableDefinition("", "", false);
			}
		});
		const typeDefinitionProviderDisposable = vscode.languages.registerTypeDefinitionProvider({language: "javascript", scheme: "file"}, {
			provideTypeDefinition() {
				return UIClassDefinitionFinder.getPositionAndUriOfCurrentVariableDefinition("", "", true);
			}
		});
		const XMLDefinitionProviderDisposable = vscode.languages.registerDefinitionProvider({language: "xml", scheme: "file"}, {
			provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
				return XMLDefinitionProvider.provideDefinitionsFor(document, position);
			}
		});

		UI5Plugin.getInstance().addDisposable(definitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(typeDefinitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(XMLDefinitionProviderDisposable);
	}
}