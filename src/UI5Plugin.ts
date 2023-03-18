import { ParserFactory, ParserPool, UI5JSParser, WorkspaceFolder } from "ui5plugin-parser";
import * as vscode from "vscode";
import { SAPUIDefineFactory } from "./classes/providers/completionitems/factories/js/sapuidefine/SAPUIDefineFactory";
import { WorkspaceCompletionItemFactory } from "./classes/providers/completionitems/factories/js/sapuidefine/WorkspaceCompletionItemFactory";
import { StandardXMLCompletionItemFactory } from "./classes/providers/completionitems/factories/xml/StandardXMLCompletionItemFactory";
import { CodeActionRegistrator } from "./classes/registrators/CodeActionRegistrator";
import { CodeLensRegistrator } from "./classes/registrators/CodeLensRegistrator";
import { CommandRegistrator } from "./classes/registrators/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/registrators/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/registrators/DefinitionProviderRegistrator";
import { DiagnosticsRegistrator } from "./classes/registrators/DiagnosticsRegistrator";
import { HoverRegistrator } from "./classes/registrators/HoverRegistrator";
import { JSRenameRegistrator } from "./classes/registrators/RenameRegistrator";
import { SignatureHelpRegistrator } from "./classes/registrators/SignatureHelpRegistrator";
import { TreeDataProviderRegistrator } from "./classes/registrators/TreeDataProviderRegistrator";
import { XMLFormatterRegistrator } from "./classes/registrators/XMLFormatterRegistrator";
import { FileWatcherMediator } from "./classes/utils/FileWatcherMediator";
import Progress from "./classes/utils/Progress";

export class UI5Plugin {
	static waitFor(ms: number) {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}
	private static _instance?: UI5Plugin;
	public static getInstance() {
		if (!UI5Plugin._instance) {
			UI5Plugin._instance = new UI5Plugin();
		}

		return UI5Plugin._instance;
	}

	public context?: vscode.ExtensionContext;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		return Progress.show(async () => {
			try {
				const workspaceFolders =
					vscode.workspace.workspaceFolders?.map(wsFolder => {
						return new WorkspaceFolder(wsFolder.uri.fsPath);
					}) ?? [];

				CommandRegistrator.register(false);
				const globalStoragePath = context.globalStorageUri.fsPath;
				const parsers = await ParserFactory.createInstances(workspaceFolders, globalStoragePath);
				parsers.forEach(parser => {
					const manifests = parser.fileReader.getAllManifests();
					if (manifests.length > 1) {
						vscode.window.showInformationMessage(
							`Project in workspace "${parser.workspaceFolder.fsPath}" has ${manifests.length} manifests. Nested manifest projects are not supported and might work inconsistently.`
						);
					} else if (manifests.length === 0) {
						vscode.window.showInformationMessage(
							`No manifests found for project in "${parser.workspaceFolder.fsPath}" workspace.`
						);
						ParserPool.deregister(parser);
					}
				});
				if (parsers.length === 0) {
					this.registerFallbackCommands();
					return;
				}

				const fileWatcherMediator = new FileWatcherMediator();
				parsers.forEach(parser => {
					parser.setCustomData("WorkspaceCompletionItemFactory", new WorkspaceCompletionItemFactory(parser));
					parser.setCustomData("FileWatcherMediator", fileWatcherMediator);
					parser.setCustomData(
						"StandardXMLCompletionItemFactory",
						new StandardXMLCompletionItemFactory(parser)
					);
					if (parser instanceof UI5JSParser) {
						parser.setCustomData("SAPUIDefineFactory", new SAPUIDefineFactory(parser));
					}
				});
				await CompletionItemRegistrator.register();
				CommandRegistrator.register(true);
				DefinitionProviderRegistrator.register();
				SignatureHelpRegistrator.register();
				DiagnosticsRegistrator.register();
				CodeLensRegistrator.register();
				CodeActionRegistrator.register();
				HoverRegistrator.register();
				XMLFormatterRegistrator.register();
				JSRenameRegistrator.register();
				TreeDataProviderRegistrator.register();
				fileWatcherMediator.register();

				for (const parser of parsers) {
					const xmlCompletionItemFactory = parser.getCustomData<StandardXMLCompletionItemFactory>(
						"StandardXMLCompletionItemFactory"
					);
					await xmlCompletionItemFactory?.preloadCompletionItems();
				}
			} catch (error: any) {
				console.error(error);
				vscode.window.showErrorMessage(`SAPUI5 Extension error: ${error.message}`);
				this.registerFallbackCommands();
			}
		}, "Initializing");
	}

	registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}
}

export enum ProjectType {
	ts,
	js
}
