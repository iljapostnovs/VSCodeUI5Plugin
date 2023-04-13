import { ParserPool } from "ui5plugin-parser";
import * as vscode from "vscode";

export class ClearCacheCommand {
	static subscribeToPropertyChange() {
		// const disposable = vscode.workspace.onDidChangeConfiguration(event => {
		// 	const isAnyConfigurationAffected =
		// 		event.affectsConfiguration("ui5.plugin.jsCodeLens") ||
		// 		event.affectsConfiguration("ui5.plugin.xmlCodeLens") ||
		// 		event.affectsConfiguration("ui5.plugin.signatureHelp") ||
		// 		event.affectsConfiguration("ui5.plugin.xmlDiagnostics");
		// 	if (
		// 		event.affectsConfiguration("ui5.plugin.libsToLoad") ||
		// 		event.affectsConfiguration("ui5.plugin.dataSource")
		// 	) {
		// 		this.clearCache();
		// 	} else if (isAnyConfigurationAffected) {
		// 		ClearCacheCommand.reloadWindow();
		// 	}
		// });
		// UI5Plugin.getInstance().addDisposable(disposable);
	}

	static clearCache() {
		ParserPool.clearCache();
		ClearCacheCommand.reloadWindow();
	}

	public static async reloadWindow() {
		const ACTION = "Reload";

		const selectedAction = await vscode.window.showInformationMessage(
			"Reload window in order for change in extension ui5.plugin configuration to take effect.",
			ACTION
		);

		if (selectedAction === ACTION) {
			vscode.commands.executeCommand("workbench.action.reloadWindow");
		}
	}
}
