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
import { JSRenameRegistrator } from "./classes/registrators/RenameRegistreator";
import { TreeDataProviderRegistrator } from "./classes/registrators/TreeDataProviderRegistrator";
import { UI5Parser, WorkspaceFolder } from "ui5plugin-parser";
import { VSCodeParserConfigHandler } from "./classes/ui5parser/VSCodeParserConfigHandler";
import { glob } from "glob";
import * as path from "path";
import { TSFileReader } from "./typescript/parsing/TSFileReader";
import { TSClassFactory } from "./typescript/parsing/TSClassFactory";
import { UI5TSParser } from "./typescript/parsing/UI5TSParser";

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
		let fnInitialize: (context: vscode.ExtensionContext) => Promise<void> = this._initialize.bind(this);
		if (this._getIsTypescriptProject()) {
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
	private _getIsTypescriptProject() {
		const escapedFileSeparator = "\\" + path.sep;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});

		const tsFiles = workspaceFolders?.flatMap(wsFolder => {
			const oConfigHandler = new VSCodeParserConfigHandler();
			const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const exclusions: string[] = oConfigHandler.getExcludeFolderPatterns();
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`;
			});
			return glob.sync(`${wsFolderFSPath}/**/*.ts`, {
				ignore: exclusionPaths
			});
		});

		return !!tsFiles?.length || false;
	}
	private async _initialize(context: vscode.ExtensionContext) {
		const globalStoragePath = context.globalStorageUri.fsPath;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});
		const parser = UI5Parser.getInstance({
			configHandler: new VSCodeParserConfigHandler()
		});
		await parser.initialize(workspaceFolders, globalStoragePath);
		CommandRegistrator.register(false, ProjectType.js);
		CommandRegistrator.registerUniqueCommands();
		this.parser = UI5Parser.getInstance();
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
		const parser = UI5TSParser.getInstance({
			configHandler: configHandler,
			fileReader: new TSFileReader(configHandler, factory),
			classFactory: factory
		});

		CommandRegistrator.register(false, ProjectType.ts);
		await parser.initialize(workspaceFolders, globalStoragePath);
		/*@ts-expect-error: oh well*/
		this.parser = parser;

		UI5TSParser.getInstance()
			.classFactory.getAllCustomTSClasses()
			.forEach(UIClass => {
				UI5TSParser.getInstance().classFactory.enrichTypesInCustomClass(UIClass);
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
