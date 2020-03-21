import * as vscode from "vscode";
import { SAPUIDefineCommand } from "../../VSCommands/SAPUIDefineCommand";
import { ViewControllerSwitcher } from "../../VSCommands/switchers/ViewControllerSwitcher";
import { ClearCacheCommand } from "../../VSCommands/ClearCacheCommand";
import { ExportToI18NCommand } from "../../VSCommands/i18ncommand/ExportToI18NCommand";
import { InsertCustomClassNameCommand } from "../../VSCommands/InsertCustomClassNameCommand";
import { UI5Plugin } from "../../../UI5Plugin";
import { UMLGeneratorCommand } from "../../VSCommands/umlgenerator/UMLGeneratorCommand";

export class CommandRegistrator {
	static register(metadataLoaded: boolean) {
		/* Commands */
		if (metadataLoaded) {
			const insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", SAPUIDefineCommand.insertUIDefine);
			const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", ViewControllerSwitcher.switchBetweenViewController);
			const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", ExportToI18NCommand.export);
			const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", InsertCustomClassNameCommand.insertCustomClassName);
			const generateUMLClassDiagramCommand = vscode.commands.registerCommand("ui5plugin.generateUMLClassDiagram", UMLGeneratorCommand.generateUMLForCurrentClass);

			UI5Plugin.getInstance().addDisposable(insertUIDefineCommand);
			UI5Plugin.getInstance().addDisposable(switcherCommand);
			UI5Plugin.getInstance().addDisposable(exportToI18NCommand);
			UI5Plugin.getInstance().addDisposable(insertCustomClassNameCommand);
			UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramCommand);
		} else {
			const clearCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", ClearCacheCommand.clearCache);
			UI5Plugin.getInstance().addDisposable(clearCacheCommand);

			/* Events */
			ClearCacheCommand.subscribeToPropertyChange();
		}

		console.log("Commands registered");
	}
}