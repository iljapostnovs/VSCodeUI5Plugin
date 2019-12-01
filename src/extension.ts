import * as vscode from "vscode";
import { FileReader } from "./classes/Util/FileReader";
import { CommandRegistrator } from "./classes/Util/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/Util/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/Util/DefinitionProviderRegistrator";

export async function activate(context: vscode.ExtensionContext) {
	const manifests = FileReader.getAllManifests();

	if (manifests.length > 0) {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Loading Libs",
			cancellable: false
		}, (progress) => {

			progress.report({ increment: 0 });

			return new Promise(async resolve => {
				try {
					CommandRegistrator.register(context);

					DefinitionProviderRegistrator.register(context);

					await CompletionItemRegistrator.register(context, progress);

					FileReader.synchroniseCacheOnDocumentSave();

					resolve();
				} catch (error) {
					console.log(error);
				}
			});
		});
	}
}
