import { writeFile } from "fs/promises";
import { join } from "path";
import { UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { ReusableMethods } from "../providers/reuse/ReusableMethods";
import Progress from "../utils/Progress";
import { MassXMLSourcePrompt } from "../utils/xmlmetadata/MassXMLSourcePrompt";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import { FallbackCommand } from "../vscommands/FallbackCommand";
import { InsertCustomClassNameCommand } from "../vscommands/InsertCustomClassNameCommand";
import { SAPUIDefineCommand } from "../vscommands/SAPUIDefineCommand";
import GenerateIDCommand from "../vscommands/generateids/GenerateIDCommand";
import { GenerateTypeJSDocCommand } from "../vscommands/generatetypedoc/GenerateTypeJSDocCommand";
import { ExportToI18NCommand } from "../vscommands/i18ncommand/ExportToI18NCommand";
import { ControllerModelViewSwitcher } from "../vscommands/switchers/ViewControllerSwitcher";
import { TSODataInterfaceGenerator } from "../vscommands/tsinterfacegenerator/implementation/TSODataInterfaceGenerator";
import { TSXMLInterfaceGenerator } from "../vscommands/tsinterfacegenerator/implementation/TSXMLInterfaceGenerator";
import { GenerateERDiagramCommand } from "../vscommands/umlgenerator/GenerateERDiagramCommand";
import { UMLGeneratorCommand } from "../vscommands/umlgenerator/UMLGeneratorCommand";
import BulkExportToI18NCommand from "../vscommands/i18ncommand/BulkExportToI18NCommand";

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
			async () => {
				const parser = await ReusableMethods.getOrPromptParser();
				if (parser && parser instanceof UI5JSParser) {
					new SAPUIDefineCommand(parser).insertUIDefine();
				}
			}
		);
		const openNewDocumentCommand = vscode.commands.registerCommand(
			"ui5plugin.openNewDocument",
			async (content: string, language: string) => {
				const document = await vscode.workspace.openTextDocument({
					content: content,
					language: language
				});
				await vscode.window.showTextDocument(document);
			}
		);
		const switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (!parser) {
				return;
			}

			try {
				await new ControllerModelViewSwitcher(parser).switchBetweenControllerModelView();
			} catch (error: any) {
				await vscode.window.showErrorMessage(
					`Error ocurred while switching between MVC. Message: ${error.message}`
				);
			}
		});
		const exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (!parser) {
				return;
			}

			try {
				await new ExportToI18NCommand(parser).export();
			} catch (error: any) {
				await vscode.window.showErrorMessage(
					`Error ocurred while exporting to i18n. Message: ${error.message}`
				);
			}
		});
		const bulkExportToI18NCommand = vscode.commands.registerCommand("ui5plugin.bulkExportToi18n", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			const document = vscode.window.activeTextEditor?.document;
			if (!parser || !document) {
				return;
			}

			try {
				await new BulkExportToI18NCommand(parser).export(document);
			} catch (error: any) {
				await vscode.window.showErrorMessage(
					`Error ocurred while exporting to i18n. Message: ${error.message}`
				);
			}
		});
		const insertCustomClassNameCommand = vscode.commands.registerCommand("ui5plugin.insertCustomClassName", () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			if (!parser) {
				return;
			}

			new InsertCustomClassNameCommand(parser).insertCustomClassName();
		});
		const generateUMLClassDiagramCommand = vscode.commands.registerCommand(
			"ui5plugin.generateUMLClassDiagram",
			async () => {
				const parser = await ReusableMethods.getOrPromptParser();
				if (!parser) return;

				try {
					new UMLGeneratorCommand(parser).generateUMLForCurrentClass();
				} catch (error: any) {
					await vscode.window.showErrorMessage(
						`Error ocurred while generating UML Diagram. Message: ${error.message}`
					);
				}
			}
		);
		const generateUMLClassDiagramForWholeProject = vscode.commands.registerCommand(
			"ui5plugin.generateUMLClassDiagramsForWholeProject",
			async () => {
				const parser = await ReusableMethods.getOrPromptParser();
				if (!parser) return;

				try {
					await new UMLGeneratorCommand(parser).generateUMLForWholeProject();
				} catch (error: any) {
					vscode.window.showErrorMessage(error.message);
				}
			}
		);
		const generateERDiagram = vscode.commands.registerCommand(
			"ui5plugin.generateERDiagramFromMetadata",
			async () => {
				try {
					const parser = await ReusableMethods.getOrPromptParser();
					if (!parser) return;
					await new GenerateERDiagramCommand(parser).generateERDiagram();
				} catch (error: any) {
					await vscode.window.showErrorMessage(
						`Error ocurred while generating ER Diagram. Message: ${error.message}`
					);
				}
			}
		);
		const generateTypeDefDoc = vscode.commands.registerCommand(
			"ui5plugin.generateJSTypeDefDocFromMetadata",
			async () => {
				try {
					await new GenerateTypeJSDocCommand().execute();
				} catch (error: any) {
					await vscode.window.showErrorMessage(
						`Error ocurred while generating JS TypeDefs. Message: ${error.message}`
					);
				}
			}
		);

		interface IGenerateTSXMLFileInterfacesArg {
			shouldOpenDocument: boolean;
		}
		const generateTSXMLFileInterfacesCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSXMLFileInterfaces",
			async (options: IGenerateTSXMLFileInterfacesArg = { shouldOpenDocument: true }) => {
				try {
					const parser = await ReusableMethods.getOrPromptParser();
					if (!parser) return;

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
				} catch (error: any) {
					await vscode.window.showErrorMessage(
						`Error ocurred while generating TS Interfaces. Message: ${error.message}`
					);
				}
			}
		);

		const generateODataInterfaceCommand = vscode.commands.registerCommand(
			"ui5plugin.generateTSODataInterfaces",
			async () => {
				try {
					const oTSInterfaceGenerator = new TSODataInterfaceGenerator();
					const content = await oTSInterfaceGenerator.generate();

					const relativePath = vscode.workspace
						.getConfiguration("ui5.plugin")
						.get<string>("TSODataInterfacesPath");
					const parser = await ReusableMethods.getOrPromptParser();
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
				} catch (error: any) {
					await vscode.window.showErrorMessage(
						`Error ocurred while generating TS Interfaces. Message: ${error.message}`
					);
				}
			}
		);

		const generateMassODataInterfaceCommand = vscode.commands.registerCommand(
			"ui5plugin.generateMassTSODataInterfaces",
			() => {
				return Progress.show(async () => {
					try {
						const parser = await ReusableMethods.getOrPromptParser();
						if (!parser) {
							return;
						}

						const XMLSourcePrompt = new MassXMLSourcePrompt();
						const results = await XMLSourcePrompt.getXMLMetadataText();

						const whenInterfacesAreGenerated = results.map(async result => {
							const oTSInterfaceGenerator = new TSODataInterfaceGenerator();
							const tsInterfaces = await oTSInterfaceGenerator.generate(result.metadataText);

							return { path: result.path, content: tsInterfaces };
						});

						const interfaces = await Promise.all(whenInterfacesAreGenerated);

						const whenFilesAreWritten = interfaces.map(theInterface => {
							const absolutePath = join(parser.workspaceFolder.fsPath, theInterface.path);
							return writeFile(absolutePath, theInterface.content, {
								encoding: "utf8"
							});
						});

						await Promise.all(whenFilesAreWritten);

						vscode.window.showInformationMessage("TS Interfaces generated successfully");
					} catch (error: any) {
						await vscode.window.showErrorMessage(
							`Error ocurred while generating TS Interfaces. Message: ${error.message}`
						);
					}
				}, "Fetching metadata...");
			}
		);
		const generateIds = vscode.commands.registerCommand("ui5plugin.generateIds", async () => {
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			const activeDocument = vscode.window.activeTextEditor?.document;
			if (!parser || !activeDocument) {
				return;
			}

			try {
				await new GenerateIDCommand(new TextDocumentAdapter(activeDocument), parser).execute();
				await vscode.window.showInformationMessage("IDs generated successfully");
			} catch (error: any) {
				await vscode.window.showErrorMessage(`Error ocurred while generating ids. Message: ${error.message}`);
			}
		});

		UI5Plugin.getInstance().addDisposable(insertUIDefineCommand);
		UI5Plugin.getInstance().addDisposable(openNewDocumentCommand);
		UI5Plugin.getInstance().addDisposable(switcherCommand);
		UI5Plugin.getInstance().addDisposable(exportToI18NCommand);
		UI5Plugin.getInstance().addDisposable(bulkExportToI18NCommand);
		UI5Plugin.getInstance().addDisposable(insertCustomClassNameCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramCommand);
		UI5Plugin.getInstance().addDisposable(generateUMLClassDiagramForWholeProject);
		UI5Plugin.getInstance().addDisposable(generateERDiagram);
		UI5Plugin.getInstance().addDisposable(generateTypeDefDoc);
		UI5Plugin.getInstance().addDisposable(generateTSXMLFileInterfacesCommand);
		UI5Plugin.getInstance().addDisposable(generateODataInterfaceCommand);
		UI5Plugin.getInstance().addDisposable(generateMassODataInterfaceCommand);
		UI5Plugin.getInstance().addDisposable(generateIds);
	}

	static registerFallbackCommands() {
		const commands = [
			"ui5plugin.moveDefineToFunctionParameters",
			"ui5plugin.switchBetweenVC",
			"ui5plugin.exportToi18n",
			"ui5plugin.bulkExportToi18n",
			"ui5plugin.insertCustomClassName",
			"ui5plugin.generateUMLClassDiagram",
			"ui5plugin.generateUMLClassDiagramsForWholeProject",
			"ui5plugin.generateERDiagramFromMetadata",
			"ui5plugin.generateTSXMLFileInterfaces",
			"ui5plugin.generateTSODataInterfaces",
			"ui5plugin.generateMassTSODataInterfaces",
			"ui5plugin.generateJSTypeDefDocFromMetadata",
			"ui5plugin.generateIds"
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
