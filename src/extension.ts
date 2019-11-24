import * as vscode from "vscode";
import { CompletionItemDAO } from "./classes/DAO/CompletionItemDAO"
import { GeneratorFactory } from "./classes/generators/GeneratorFactory";
import { DefineEditor as SAPUIDefineCommand } from "./classes/commands/fileEditors/SAPUIDefineCommand";
import { ExportToI18NCommand } from "./classes/commands/fileEditors/ExportToI18NCommand";
import { ClearCacheCommand } from "./classes/commands/ClearCacheCommand";
import { ViewControllerSwitcher } from "./classes/commands/switchers/ViewControllerSwitcher";
import { DefineGenerator } from "./classes/generators/define/UIDefineCompletionItemGenerator";
import { WorkspaceCompletionItemDAO } from "./classes/DAO/WorkspaceCompletionItemDAO";
import { SyntaxAnalyzer } from "./classes/SyntaxAnalyzer";
import { MainLooper } from "./classes/SyntaxParsers/JSParser/MainLooper";
import { JSVariable } from "./classes/SyntaxParsers/JSParser/types/Variable";
import { DifferentJobs } from "./classes/SyntaxParsers/JSParser/DifferentJobs";
import { UIClassDAO } from "./classes/DAO/UIClassDAO";
import { FileReader } from "./classes/FileReader";

export async function activate(context: vscode.ExtensionContext) {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Loading Libs",
		cancellable: false
	}, (progress) => {

		progress.report({ increment: 0 });

		return new Promise(async resolve => {
			try {
				/* Commands */
				let insertUIDefineCommand = vscode.commands.registerCommand("ui5plugin.moveDefineToFunctionParameters", SAPUIDefineCommand.insertUIDefine);
				context.subscriptions.push(insertUIDefineCommand);

				let switcherCommand = vscode.commands.registerCommand("ui5plugin.switchBetweenVC", ViewControllerSwitcher.switchBetweenViewController);
				context.subscriptions.push(switcherCommand);

				let cleacCacheCommand = vscode.commands.registerCommand("ui5plugin.clearCache", ClearCacheCommand.clearCache.bind(undefined, context));
				context.subscriptions.push(cleacCacheCommand);

				let exportToI18NCommand = vscode.commands.registerCommand("ui5plugin.exportToi18n", ExportToI18NCommand.export);
				context.subscriptions.push(exportToI18NCommand);

				console.log("Commands registered");

				/* Completion Items */
				let XMLCompletionItemDAO = new CompletionItemDAO(GeneratorFactory.language.xml);
				let XMLCompletionItems = await XMLCompletionItemDAO.getLanguageSpecificCompletionItems(progress, context);
				console.log("XML Completion Items generated");

				let JSCompletionItemDAO = new CompletionItemDAO(GeneratorFactory.language.js);
				let JSDefineCompletionItems = await JSCompletionItemDAO.getLanguageSpecificCompletionItems(progress, context)
				console.log("JS Completion Items generated");

				let JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
						let itemsToReturn:vscode.CompletionItem[] = [];
						try {
							if (DefineGenerator.getIfCurrentPositionIsInDefine(position)) {
								itemsToReturn = JSDefineCompletionItems;
							}

							itemsToReturn = itemsToReturn.concat(JSCompletionItemDAO.generateUIClassCompletionItems());
						} catch (error) {
							console.log(error);
						}
						return itemsToReturn;
					}
				}, ".");

				let JSViewIDProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
						return JSCompletionItemDAO.generateIdCompletionItems();
					}
				}, "this.getView().byId(");

				let XMLProvider = vscode.languages.registerCompletionItemProvider({language: "xml", scheme: "file"}, {
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
						return XMLCompletionItems;
					}
				});

				context.subscriptions.push(XMLProvider);
				context.subscriptions.push(JSMethodPropertyProvider);
				context.subscriptions.push(JSViewIDProvider);

				/* Events */
				ClearCacheCommand.subscribeToPropertyChange(context);
				WorkspaceCompletionItemDAO.subscribeToFileOpening((event: vscode.TextDocument) => {
					WorkspaceCompletionItemDAO.synchronise(JSDefineCompletionItems, event);
				});

				UIClassDAO.synchroniseCacheOnDocumentSave();
				FileReader.synchroniseCacheOnDocumentSave();

				resolve();
			} catch (error) {
				console.log(error);
			}
		});
	});
}
