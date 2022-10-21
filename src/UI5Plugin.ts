import * as vscode from "vscode";
import { CommandRegistrator } from "./classes/registrators/CommandRegistrator";
import { CompletionItemRegistrator } from "./classes/registrators/CompletionItemRegistrator";
import { DefinitionProviderRegistrator } from "./classes/registrators/DefinitionProviderRegistrator";
import { FileWatcherMediator } from "./classes/utils/FileWatcherMediator";
import { SignatureHelpRegistrator } from "./classes/registrators/SignatureHelpRegistrator";
import { DiagnosticsRegistrator } from "./classes/registrators/DiagnosticsRegistrator";
import { CodeLensRegistrator } from "./classes/registrators/CodeLensRegistrator";
import { CodeActionRegistrator } from "./classes/registrators/CodeActionRegistrator";
import { HoverRegistrator } from "./classes/registrators/HoverRegistrator";
import { XMLFormatterRegistrator } from "./classes/registrators/XMLFormatterRegistrator";
import { JSRenameRegistrator } from "./classes/registrators/RenameRegistrator";
import { TreeDataProviderRegistrator } from "./classes/registrators/TreeDataProviderRegistrator";
import { UI5Parser, UI5TSParser, WorkspaceFolder } from "ui5plugin-parser";
import { VSCodeParserConfigHandler } from "./classes/ui5parser/VSCodeParserConfigHandler";
import { TSClassFactory } from "ui5plugin-parser/dist/classes/UI5Classes/TSClassFactory";
import { TSFileReader } from "ui5plugin-parser/dist/classes/utils/TSFileReader";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";

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

	public parser!: AbstractUI5Parser<AbstractCustomClass>;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		let fnInitialize: (context: vscode.ExtensionContext) => Promise<void> = this._initialize.bind(this);

		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		}) ?? [];
		const oConfigHandler = new VSCodeParserConfigHandler();
		if (AbstractUI5Parser.getIsTypescriptProject(workspaceFolders, oConfigHandler)) {
			this.projectType = ProjectType.ts;
			fnInitialize = this._initializeTS.bind(this);
		}

		UI5Plugin.pWhenPluginInitialized = new Promise((resolve, reject) => {
			setTimeout(() => {
				vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Window,
						title: "UI5Plugin",
						cancellable: false
					},
					async progress => {
						progress.report({
							message: "Initializing...",
							increment: 1
						});
						setTimeout(async () => {
							await fnInitialize(context)
								.then(() => {
									progress.report({
										message: "Initializing...",
										increment: 100
									});
									resolve();
								})
								.catch((error: any) => {
									progress.report({
										increment: 100
									});
									console.error(error);
									reject("Couldn't initialize plugin: " + JSON.stringify(error.message));
								});
						}, 0);
					}
				);
			}, 0);
		});

		return UI5Plugin.pWhenPluginInitialized;
	}
	private async _initialize(context: vscode.ExtensionContext) {
		const globalStoragePath = context.globalStorageUri.fsPath;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});
		const parser = AbstractUI5Parser.getInstance<UI5Parser, CustomUIClass>(UI5Parser, {
			configHandler: new VSCodeParserConfigHandler()
		});
		await parser.initialize(workspaceFolders, globalStoragePath);
		CommandRegistrator.register(false, ProjectType.js);
		CommandRegistrator.registerUniqueCommands();
		this.parser = AbstractUI5Parser.getInstance(UI5Parser);
		await CompletionItemRegistrator.register();
		FileWatcherMediator.register();
		CommandRegistrator.register(true, ProjectType.js);
		DefinitionProviderRegistrator.register();
		SignatureHelpRegistrator.register();
		DiagnosticsRegistrator.register(ProjectType.js);
		CodeLensRegistrator.register(ProjectType.js);
		CodeActionRegistrator.register();
		HoverRegistrator.register();
		XMLFormatterRegistrator.register();
		JSRenameRegistrator.register();
		TreeDataProviderRegistrator.register();
	}

	private async _initializeTS(context: vscode.ExtensionContext) {
		const globalStoragePath = context.globalStorageUri.fsPath;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});
		const configHandler = new VSCodeParserConfigHandler();
		const factory = new TSClassFactory();

		(UI5Parser as unknown as any).getInstance = UI5TSParser.getInstance;
		const parser = AbstractUI5Parser.getInstance<UI5TSParser, CustomTSClass>(UI5TSParser, {
			configHandler: configHandler,
			fileReader: new TSFileReader(configHandler, factory),
			classFactory: factory
		});

		CommandRegistrator.register(false, ProjectType.ts);
		await parser.initialize(workspaceFolders, globalStoragePath);
		this.parser = parser;

		AbstractUI5Parser.getInstance(UI5TSParser)
			.classFactory.getAllCustomUIClasses()
			.forEach(UIClass => {
				AbstractUI5Parser.getInstance(UI5TSParser).classFactory.enrichTypesInCustomClass(UIClass);
			});

		CommandRegistrator.register(true, ProjectType.ts);
		CommandRegistrator.registerUniqueCommands();
		CodeActionRegistrator.registerTS();
		CodeLensRegistrator.register(ProjectType.ts);
		CompletionItemRegistrator.registerTS();
		DefinitionProviderRegistrator.registerTS();
		HoverRegistrator.registerTS();
		XMLFormatterRegistrator.register();
		DiagnosticsRegistrator.register(ProjectType.ts);
		FileWatcherMediator.register();
		JSRenameRegistrator.registerTS();
		TreeDataProviderRegistrator.register();
	}

	static registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}

	projectType: ProjectType = ProjectType.js;
}

export enum ProjectType {
	ts,
	js
}
