import { UIClassDefinitionFinder } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassDefinitionFinder";
import * as vscode from "vscode";

export class DefinitionProviderRegistrator {
	static register(context: vscode.ExtensionContext) {
		/* Definition provider */
		const definitionProviderDisposable = vscode.languages.registerDefinitionProvider({language: "javascript", scheme: "file"}, {
			provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
				return UIClassDefinitionFinder.getPositionAndUriOfCurrentVariableDefinition();
			}
		});
		context.subscriptions.push(definitionProviderDisposable);
	}
}