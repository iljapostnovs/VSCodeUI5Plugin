import * as vscode from "vscode";
import {UI5Plugin} from "../../UI5Plugin";
import {ClearCacheCommand} from "../vscommands/ClearCacheCommand";
import {FallbackCommand} from "../vscommands/FallbackCommand";
import {ExportToI18NCommand} from "../vscommands/i18ncommand/ExportToI18NCommand";
import {InsertCustomClassNameCommand} from "../vscommands/InsertCustomClassNameCommand";
import {SAPUIDefineCommand} from "../vscommands/SAPUIDefineCommand";
import {ControllerModelViewSwitcher} from "../vscommands/switchers/ViewControllerSwitcher";
import {UMLGeneratorCommand} from "../vscommands/umlgenerator/UMLGeneratorCommand";

export class CommandRegistrator {
	static register(metadataLoaded: boolean) {
		/* Commands */
		if (metadataLoaded) {
			const insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", SAPUIDefineCommand.insertUIDefine);
			const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", ControllerModelViewSwitcher.switchBetweenControllerModelView);
			const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", ExportToI18NCommand.export);
			const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", InsertCustomClassNameCommand.insertCustomClassName);
			const generateUMLClassDiagramCommand = vscode.commands.registerCommand("ui5plugin.generateUMLClassDiagram", UMLGeneratorCommand.generateUMLForCurrentClass);
			const generateUMLClassDiagramForWholeProject = vscode.commands.registerCommand("ui5plugin.generateUMLClassDiagramsForWholeProject", UMLGeneratorCommand.generateUMLForWholeProject);

			UI5Plugin.getInstance().addDisposable(insertUIDefineCommand);
			UI5Plugin.getInstance().addDisposable(switcherCommand);
			UI5Plugin.getInstance().addDisposable(exportToI18NCommand);
			UI5Plugin.getInstance().addDisposable(insertCustomClassNameCommand);
			UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramCommand);
			UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramForWholeProject);
		} else {
			const clearCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", ClearCacheCommand.clearCache);
			UI5Plugin.getInstance().addDisposable(clearCacheCommand);

			/* Events */
			ClearCacheCommand.subscribeToPropertyChange();
		}

		console.log("Commands registered");
	}

	static registerFallbackCommands() {
		const insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const generateUMLClassDiagramCommand = vscode.commands.registerCommand("ui5plugin.generateUMLClassDiagram", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const generateUMLClassDiagramForWholeProject = vscode.commands.registerCommand("ui5plugin.generateUMLClassDiagramsForWholeProject", FallbackCommand.notifyUserThatThisIsNotUI5Project);
		const clearCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", FallbackCommand.notifyUserThatThisIsNotUI5Project);

		UI5Plugin.getInstance().addDisposable(insertUIDefineCommand);
		UI5Plugin.getInstance().addDisposable(switcherCommand);
		UI5Plugin.getInstance().addDisposable(exportToI18NCommand);
		UI5Plugin.getInstance().addDisposable(insertCustomClassNameCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramForWholeProject);
		UI5Plugin.getInstance().addDisposable(clearCacheCommand);
	}
}