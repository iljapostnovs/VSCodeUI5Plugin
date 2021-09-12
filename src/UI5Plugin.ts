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
import { UI5Parser } from "ui5plugin-parser";
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

	public parser!: UI5Parser;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize() {
		UI5Plugin.pWhenPluginInitialized = new Promise<void>((resolve, reject) => {
			this._initialize().then(resolve).catch((error: any) => {
				console.error(error);
				reject("Couldn't initialize plugin: " + JSON.stringify(error.message));
			});
		});

		return UI5Plugin.pWhenPluginInitialized;
	}
	private async _initialize() {
		CommandRegistrator.register(false);
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