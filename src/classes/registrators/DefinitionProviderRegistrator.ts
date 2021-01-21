import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { UIClassDefinitionFinder } from "../providers/definitions/js/UIClassDefinitionFinder";

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

		UI5Plugin.getInstance().addDisposable(definitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(typeDefinitionProviderDisposable);
	}
}