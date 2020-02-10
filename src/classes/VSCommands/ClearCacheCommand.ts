import * as vscode from "vscode";
import { FileReader } from "../Util/FileReader";

export class ClearCacheCommand {
	static subscribeToPropertyChange() {
		vscode.workspace.onDidChangeConfiguration(event => {
			const isLibraryVersionAffected = event.affectsConfiguration("ui5.plugin.ui5version");
			const isSrcAffected = event.affectsConfiguration("ui5.plugin.src");

			if (isLibraryVersionAffected || isSrcAffected) {
				ClearCacheCommand.reloadWindow();
			}
		});
	}

	static clearCache() {
		FileReader.clearCache(FileReader.CacheType.APIIndex);
		FileReader.clearCache(FileReader.CacheType.Metadata);
		FileReader.clearCache(FileReader.CacheType.Icons);

		ClearCacheCommand.reloadWindow();
	}

	private static reloadWindow() {
		const action = "Reload";
		vscode.window
		.showInformationMessage( `Reload window in order for change in extension ui5.plugin configuration to take effect.`, action)
		.then(selectedAction => {
			if (selectedAction === action) {
				vscode.commands.executeCommand("workbench.action.reloadWindow");
			}
		});
	}
}