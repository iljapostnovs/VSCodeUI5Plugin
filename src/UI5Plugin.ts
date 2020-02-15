import * as vscode from "vscode";
import { CommandRegistrator } from "./classes/Util/registrators/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/Util/registrators/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/Util/registrators/DefinitionProviderRegistrator";
import { FileWatcher } from "./classes/Util/FileWatcher";
import { SignatureHelpRegistrator } from "./classes/Util/registrators/SignatureHelpRegistrator";
import { DiagnosticsRegistrator } from "./classes/Util/registrators/DiagnosticsRegistrator";
import { CodeLensRegistrator } from "./classes/Util/registrators/CodeLensRegistrator";

export class UI5Plugin {
	private static instance?: UI5Plugin;
	public static getInstance() {
		if (!UI5Plugin.instance) {
			UI5Plugin.instance = new UI5Plugin();
		}

		return UI5Plugin.instance;
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
		return new Promise((resolve, reject) => {
			this.context = context;
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Loading Libs",
				cancellable: false
			}, async progress => {
				this.initializationProgress = progress;

				try {
					await this.registerProviders();
					resolve();
				} catch (error) {
					reject("Couldn't initialize plugin: " + JSON.stringify(error));
				}
			});
		});
	}
	private async registerProviders() {
		CommandRegistrator.register(false);
		await CompletionItemRegistrator.register();
		FileWatcher.register();
		CommandRegistrator.register(true);
		DefinitionProviderRegistrator.register();
		SignatureHelpRegistrator.register();
		DiagnosticsRegistrator.register();
		CodeLensRegistrator.register();
	}
}