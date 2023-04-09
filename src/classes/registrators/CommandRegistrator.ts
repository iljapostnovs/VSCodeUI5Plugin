import { writeFile } from "fs/promises";
import { join } from "path";
import { UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { ReusableMethods } from "../providers/reuse/ReusableMethods";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import { FallbackCommand } from "../vscommands/FallbackCommand";
import { InsertCustomClassNameCommand } from "../vscommands/InsertCustomClassNameCommand";
import { SAPUIDefineCommand } from "../vscommands/SAPUIDefineCommand";
import { GenerateTypeJSDocCommand } from "../vscommands/generatetypedoc/GenerateTypeJSDocCommand";
import { ExportToI18NCommand } from "../vscommands/i18ncommand/ExportToI18NCommand";
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
		const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				await new ControllerModelViewSwitcher(parser).switchBetweenControllerModelView();
			}
		});
		const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (parser) {
				await new ExportToI18NCommand(parser).export();
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
			async () => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					try {
						await new UMLGeneratorCommand(parser).generateUMLForWholeProject();
					} catch (error: any) {
						vscode.window.showErrorMessage(error.message);
					}
				}
			}
		);
		const generateERDiagram = vscode.commands.registerCommand(
			"ui5plugin.generateERDiagramFromMetadata",
			async () => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					await new GenerateERDiagramCommand(parser).generateERDiagram();
				}
			}
		);
		const generateTypeDefDoc = vscode.commands.registerCommand(
			"ui5plugin.generateJSTypeDefDocFromMetadata",
			async () => {
				await new GenerateTypeJSDocCommand().execute();
			}
		);

		interface IGenerateTSXMLFileInterfacesArg {
			shouldOpenDocument: boolean;
		}
		const generateTSXMLFileInterfacesCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSXMLFileInterfaces",
			async (options: IGenerateTSXMLFileInterfacesArg = { shouldOpenDocument: true }) => {
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				if (parser) {
					const oTSInterfaceGenerator = new TSXMLInterfaceGenerator(parser);
					const content = await oTSInterfaceGenerator.generate();

					const relativePath = vscode.workspace
						.getConfiguration("ui5.plugin")
						.get<string>("XMLFileInterfacePath");
					let document: vscode.TextDocument;
					if (relativePath) {
						const absolutePath = join(parser.workspaceFolder.fsPath, relativePath);
						await writeFile(absolutePath, content, {
							encoding: "utf8"
						});
						const uri = vscode.Uri.file(absolutePath);
						document = await vscode.workspace.openTextDocument(uri);
					} else {
						document = await vscode.workspace.openTextDocument({
							content: content,
							language: "typescript"
						});
					}
					if (options.shouldOpenDocument) {
						await vscode.window.showTextDocument(document);
					}
				}
			}
		);

		const generateODataInterfaceCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSODataInterfaces",
			async () => {
				const oTSInterfaceGenerator = new TSODataInterfaceGenerator();
				const content = await oTSInterfaceGenerator.generate();

				const relativePath = vscode.workspace
					.getConfiguration("ui5.plugin")
					.get<string>("TSODataInterfacesPath");
				const parser = ReusableMethods.getParserForCurrentActiveDocument();
				let document: vscode.TextDocument;
				if (relativePath && parser) {
					const absolutePath = join(parser.workspaceFolder.fsPath, relativePath);
					await writeFile(absolutePath, content, {
						encoding: "utf8"
					});
					const uri = vscode.Uri.file(absolutePath);
					document = await vscode.workspace.openTextDocument(uri);
				} else {
					document = await vscode.workspace.openTextDocument({
						content: content,
						language: "typescript"
					});
				}
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
