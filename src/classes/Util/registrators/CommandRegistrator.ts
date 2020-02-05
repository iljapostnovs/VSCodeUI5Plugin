import * as vscode from "vscode";
import { SAPUIDefineCommand } from "../../VSCommands/SAPUIDefineCommand";
import { ViewControllerSwitcher } from "../../VSCommands/switchers/ViewControllerSwitcher";
import { ClearCacheCommand } from "../../VSCommands/ClearCacheCommand";
import { ExportToI18NCommand } from "../../VSCommands/ExportToI18NCommand";
import { InsertCustomClassNameCommand } from "../../VSCommands/InsertCustomClassNameCommand";

export class CommandRegistrator {
	static register(context: vscode.ExtensionContext, metadataLoaded: boolean) {
		/* Commands */
		if (metadataLoaded) {
			const insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", SAPUIDefineCommand.insertUIDefine);
			context.subscriptions.push(insertUIDefineCommand);

			const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", ViewControllerSwitcher.switchBetweenViewController);
			context.subscriptions.push(switcherCommand);

			const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", ExportToI18NCommand.export);
			context.subscriptions.push(exportToI18NCommand);

			const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", InsertCustomClassNameCommand.insertCustomClassName);
			context.subscriptions.push(insertCustomClassNameCommand);
		} else {
			const cleacCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", ClearCacheCommand.clearCache.bind(undefined, context));
			context.subscriptions.push(cleacCacheCommand);

			/* Events */
			ClearCacheCommand.subscribeToPropertyChange();
		}

		console.log("Commands registered");
	}
}