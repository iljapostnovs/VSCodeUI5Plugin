import { UIClassDefinitionFinder } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassDefinitionFinder";
import * as vscode from "vscode";

export class DefinitionProviderRegistrator {
	static register(context: vscode.ExtensionContext) {
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
		context.subscriptions.push(definitionProviderDisposable);
		context.subscriptions.push(typeDefinitionProviderDisposable);
	}
}