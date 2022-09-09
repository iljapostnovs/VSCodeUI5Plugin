import * as vscode from "vscode";
import { CommandRegistrator } from "./classes/registrators/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/registrators/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/registrators/DefinitionProviderRegistrator";
import { FileWatcherMediator } from "./classes/utils/FileWatcherMediator";
import { SignatureHelpRegistrator } from "./classes/registrators/SignatureHelpRegistrator";
import { DiagnosticsRegistrator } from "./classes/registrators/DiagnosticsRegistrator";
import { CodeLensRegistrator } from "./classes/registrators/CodeLensRegistrator";
import { JSCodeActionRegistrator } from "./classes/registrators/CodeActionRegistrator";
import { HoverRegistrator } from "./classes/registrators/HoverRegistrator";
import { XMLFormatterRegistrator } from "./classes/registrators/XMLFormatterRegistrator";
import { JSRenameRegistrator } from "./classes/registrators/RenameRegistreator";
import { TreeDataProviderRegistrator } from "./classes/registrators/TreeDataProviderRegistrator";
import { UI5Parser, WorkspaceFolder } from "ui5plugin-parser";
import { VSCodeParserConfigHandler } from "./classes/ui5parser/VSCodeParserConfigHandler";
export class UI5Plugin {
	private static _instance?: UI5Plugin;
	public static pWhenPluginInitialized: Promise<void> | undefined;
	public static getInstance() {
		if (!UI5Plugin._instance) {
			UI5Plugin._instance = new UI5Plugin();
		}

		return UI5Plugin._instance;
	}

	public context?: vscode.ExtensionContext;

	public parser!: UI5Parser;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		UI5Plugin.pWhenPluginInitialized = new Promise<void>((resolve, reject) => {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Window,
				title: "UI5Plugin",
				cancellable: false
			}, async progress => {
				progress.report({
					message: "Initializing...",
					increment: 0
				});
				await this._initialize(context).then(() => {
					progress.report({
						message: "Initializing...",
						increment: 100
					});
					resolve();
				}).catch((error: any) => {
					progress.report({
						increment: 100
					});
					console.error(error);
					reject("Couldn't initialize plugin: " + JSON.stringify(error.message));
				});
			});
		});

		return UI5Plugin.pWhenPluginInitialized;
	}
	private async _initialize(context: vscode.ExtensionContext) {
		const globalStoragePath = context.globalStorageUri.fsPath;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		})
		const parser = UI5Parser.getInstance({
			configHandler: new VSCodeParserConfigHandler()
		});
		await parser.initialize(workspaceFolders, globalStoragePath);
		CommandRegistrator.register(false);
		CommandRegistrator.registerUniqueCommands();
		this.parser = UI5Parser.getInstance();
		await CompletionItemRegistrator.register();
		FileWatcherMediator.register();
		CommandRegistrator.register(true);
		DefinitionProviderRegistrator.register();
		SignatureHelpRegistrator.register();
		DiagnosticsRegistrator.register();
		CodeLensRegistrator.register();
		JSCodeActionRegistrator.register();
		HoverRegistrator.register();
		XMLFormatterRegistrator.register();
		JSRenameRegistrator.register();
		TreeDataProviderRegistrator.register();
	}

	static registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}
}