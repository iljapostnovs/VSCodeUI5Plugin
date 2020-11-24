import { UIClassDefinitionFinder } from "../../UI5Classes/UI5Parser/UIClass/UIClassDefinitionFinder";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";

export class DefinitionProviderRegistrator {
	static register() {
		/* Definition provider */
		const definitionProviderDisposable = vscode.languages.registerDefinitionProvider({language: "javascript", scheme: "file"}, {
			provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
				return UIClassDefinitionFinder.getPositionAndUriOfCurrentVariableDefinition("", "", false);
			}
		});
		const typeDefinitionProviderDisposable = vscode.languages.registerTypeDefinitionProvider({language: "javascript", scheme: "file"}, {
			provideTypeDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
				return UIClassDefinitionFinder.getPositionAndUriOfCurrentVariableDefinition("", "", true);
			}
		});

		UI5Plugin.getInstance().addDisposable(definitionProviderDisposable);
		UI5Plugin.getInstance().addDisposable(typeDefinitionProviderDisposable);
	}
}