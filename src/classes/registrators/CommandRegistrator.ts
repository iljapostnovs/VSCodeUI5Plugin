import { UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { ReusableMethods } from "../providers/reuse/ReusableMethods";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import { FallbackCommand } from "../vscommands/FallbackCommand";
import { GenerateTypeJSDocCommand } from "../vscommands/generatetypedoc/GenerateTypeJSDocCommand";
import { ExportToI18NCommand } from "../vscommands/i18ncommand/ExportToI18NCommand";
import { InsertCustomClassNameCommand } from "../vscommands/InsertCustomClassNameCommand";
import { SAPUIDefineCommand } from "../vscommands/SAPUIDefineCommand";
import { ControllerModelViewSwitcher } from "../vscommands/switchers/ViewControllerSwitcher";
import { TSODataInterfaceGenerator } from "../vscommands/tsinterfacegenerator/implementation/TSODataInterfaceGenerator";
import { TSXMLInterfaceGenerator } from "../vscommands/tsinterfacegenerator/implementation/TSXMLInterfaceGenerator";
import { GenerateERDiagramCommand } from "../vscommands/umlgenerator/GenerateERDiagramCommand";
import { UMLGeneratorCommand } from "../vscommands/umlgenerator/UMLGeneratorCommand";

export class CommandRegistrator {
	static register(metadataLoaded: boolean) {
		/* Commands */
		if (metadataLoaded) {
			this._init();
		} else {
			const clearCacheCommand = vscode.commands.registerCommand(
				"ui5plugin.clearCache",
				ClearCacheCommand.clearCache
			);
			UI5Plugin.getInstance().addDisposable(clearCacheCommand);

			/* Events */
			ClearCacheCommand.subscribeToPropertyChange();
		}

		console.log("Commands registered");
	}

	private static _init() {
		const insertUIDefineCommand = vscode.commands.registerCommand(
			"ui5plugin.moveDefineToFunctionParameters",
			() => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser && parser instanceof UI5JSParser) {
					new SAPUIDefineCommand(parser).insertUIDefine();
				}
			}
		);
		const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				new ControllerModelViewSwitcher(parser).switchBetweenControllerModelView();
			}
		});
		const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				new ExportToI18NCommand(parser).export();
			}
		});
		const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				new InsertCustomClassNameCommand(parser).insertCustomClassName();
			}
		});
		const generateUMLClassDiagramCommand = vscode.commands.registerCommand(
			"ui5plugin.generateUMLClassDiagram",
			() => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					new UMLGeneratorCommand(parser).generateUMLForCurrentClass();
				}
			}
		);
		const generateUMLClassDiagramForWholeProject = vscode.commands.registerCommand(
			"ui5plugin.generateUMLClassDiagramsForWholeProject",
			() => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					new UMLGeneratorCommand(parser).generateUMLForWholeProject();
				}
			}
		);
		const generateERDiagram = vscode.commands.registerCommand("ui5plugin.generateERDiagramFromMetadata", () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				new GenerateERDiagramCommand(parser).generateERDiagram();
			}
		});
		const generateTypeDefDoc = vscode.commands.registerCommand("ui5plugin.generateJSTypeDefDocFromMetadata", () => {
			new GenerateTypeJSDocCommand().execute();
		});

		const generateTSXMLFileInterfacesCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSXMLFileInterfaces",
			async () => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					const oTSInterfaceGenerator = new TSXMLInterfaceGenerator(parser);
					const sContent = await oTSInterfaceGenerator.generate();

					const document = await vscode.workspace.openTextDocument({
						content: sContent,
						language: "typescript"
					});
					await vscode.window.showTextDocument(document);
				}
			}
		);

		const generateODataInterfaceCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSODataInterfaces",
			async () => {
				const oTSInterfaceGenerator = new TSODataInterfaceGenerator();
				const sContent = await oTSInterfaceGenerator.generate();

				const document = await vscode.workspace.openTextDocument({
					content: sContent,
					language: "typescript"
				});
				await vscode.window.showTextDocument(document);
			}
		);

		UI5Plugin.getInstance().addDisposable(insertUIDefineCommand);
		UI5Plugin.getInstance().addDisposable(switcherCommand);
		UI5Plugin.getInstance().addDisposable(exportToI18NCommand);
		UI5Plugin.getInstance().addDisposable(insertCustomClassNameCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramForWholeProject);
		UI5Plugin.getInstance().addDisposable(generateERDiagram);
		UI5Plugin.getInstance().addDisposable(generateTypeDefDoc);
		UI5Plugin.getInstance().addDisposable(generateTSXMLFileInterfacesCommand);
		UI5Plugin.getInstance().addDisposable(generateODataInterfaceCommand);
	}

	static registerFallbackCommands() {
		const commands = [
			"ui5plugin.moveDefineToFunctionParameters",
			"ui5plugin.switchBetweenVC",
			"ui5plugin.exportToi18n",
			"ui5plugin.insertCustomClassName",
			"ui5plugin.generateUMLClassDiagram",
			"ui5plugin.generateUMLClassDiagramsForWholeProject",
			"ui5plugin.generateERDiagramFromMetadata",
			"ui5plugin.generateTSXMLFileInterfaces",
			"ui5plugin.generateTSODataInterfaces"
		];

		commands.forEach(command => {
			const disposable = vscode.commands.registerCommand(
				command,
				FallbackCommand.notifyUserThatThisIsNotUI5Project
			);
			UI5Plugin.getInstance().addDisposable(disposable);
		});
	}
}
