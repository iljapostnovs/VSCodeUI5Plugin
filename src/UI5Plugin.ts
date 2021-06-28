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
import { FileReader } from "./classes/utils/FileReader";
import { JSRenameRegistrator } from "./classes/registrators/RenameRegistreator";
import { TreeDataProviderRegistrator } from "./classes/registrators/TreeDataProviderRegistrator";
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
	public initializationProgress?: vscode.Progress<{
		message?: string | undefined;
		increment?: number | undefined;
	}>;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		UI5Plugin.pWhenPluginInitialized = new Promise<void>((resolve, reject) => {
			this.context = context;
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Window,
				title: "Loading Libs",
				cancellable: false
			}, async progress => {
				this.initializationProgress = progress;

				try {
					await this._registerProviders();
					resolve();
				} catch (error) {
					console.error(error);
					reject("Couldn't initialize plugin: " + JSON.stringify(error.message));
				}
			});
		});

		return UI5Plugin.pWhenPluginInitialized;
	}
	private async _registerProviders() {
		CommandRegistrator.register(false);
		await CompletionItemRegistrator.register();
		await FileReader.readAllFiles();
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