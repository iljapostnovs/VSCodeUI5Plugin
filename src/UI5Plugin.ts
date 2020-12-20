import * as vscode from "vscode";
import { CommandRegistrator } from "./classes/registrators/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/registrators/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/registrators/DefinitionProviderRegistrator";
import { FileWatcher } from "./classes/utils/FileWatcher";
import { SignatureHelpRegistrator } from "./classes/registrators/SignatureHelpRegistrator";
import { DiagnosticsRegistrator } from "./classes/registrators/DiagnosticsRegistrator";
import { CodeLensRegistrator } from "./classes/registrators/CodeLensRegistrator";
import { JSCodeActionRegistrator } from "./classes/registrators/JSCodeActionRegistrator";
import { HoverRegistrator } from "./classes/registrators/HoverRegistrator";
import { XMLFormatterRegistrator } from "./classes/registrators/XMLFormatterRegistrator";
export class UI5Plugin {
	private static _instance?: UI5Plugin;
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
	private constructor() {}
	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		return new Promise<void>((resolve, reject) => {
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
					reject("Couldn't initialize plugin: " + JSON.stringify(error));
				}
			});
		});
	}
	private async _registerProviders() {
		CommandRegistrator.register(false);
		await CompletionItemRegistrator.register();
		FileWatcher.register();
		CommandRegistrator.register(true);
		DefinitionProviderRegistrator.register();
		SignatureHelpRegistrator.register();
		DiagnosticsRegistrator.register();
		CodeLensRegistrator.register();
		JSCodeActionRegistrator.register();
		HoverRegistrator.register();
		XMLFormatterRegistrator.register();
	}

	static registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}
}