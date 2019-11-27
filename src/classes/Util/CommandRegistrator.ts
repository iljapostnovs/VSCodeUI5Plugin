import * as vscode from "vscode";
import { SAPUIDefineCommand } from "../VSCommands/SAPUIDefineCommand";
import { ViewControllerSwitcher } from "../VSCommands/switchers/ViewControllerSwitcher";
import { ClearCacheCommand } from "../VSCommands/ClearCacheCommand";
import { ExportToI18NCommand } from "../VSCommands/ExportToI18NCommand";

export class CommandRegistrator {
	static register(context: vscode.ExtensionContext) {
		/* Commands */
		let insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", SAPUIDefineCommand.insertUIDefine);
		context.subscriptions.push(insertUIDefineCommand);

		let switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", ViewControllerSwitcher.switchBetweenViewController);
		context.subscriptions.push(switcherCommand);

		let cleacCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", ClearCacheCommand.clearCache.bind(undefined, context));
		context.subscriptions.push(cleacCacheCommand);

		let exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", ExportToI18NCommand.export);
		context.subscriptions.push(exportToI18NCommand);

		/* Events */
		ClearCacheCommand.subscribeToPropertyChange(context);

		console.log("Commands registered");
	}
}