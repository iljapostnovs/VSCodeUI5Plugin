import * as fs from "fs";
import * as vscode from "vscode";
export class ClearCacheCommand {
	static subscribeToPropertyChange(context: vscode.ExtensionContext) {
		vscode.workspace.onDidChangeConfiguration(event => {
			const isLibraryVersionAffected = event.affectsConfiguration("ui5.plugin.ui5version");
			const isSrcAffected = event.affectsConfiguration("ui5.plugin.src");
			if (isLibraryVersionAffected) {
				ClearCacheCommand.clearCache(context);
			} else if (isSrcAffected) {
				ClearCacheCommand.reloadWindow();
			}
		});
	}
	static clearCache(context: vscode.ExtensionContext) {
		const cachePath = context.globalStoragePath + "\\cache.json";
		if (fs.existsSync(cachePath)) {
			fs.unlinkSync(cachePath);
			ClearCacheCommand.reloadWindow();
		}
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