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

	public parser!: AbstractUI5Parser<AbstractCustomClass>;

	public addDisposable(disposable: vscode.Disposable) {
		this.context?.subscriptions.push(disposable);
	}
	public initialize(context: vscode.ExtensionContext) {
		let fnInitialize: (context: vscode.ExtensionContext) => Promise<void> = this._initialize.bind(this);

		const workspaceFolders =
			vscode.workspace.workspaceFolders?.map(wsFolder => {
				return new WorkspaceFolder(wsFolder.uri.fsPath);
			}) ?? [];
		const oConfigHandler = new VSCodeParserConfigHandler();
		if (AbstractUI5Parser.getIsTypescriptProject(workspaceFolders, oConfigHandler)) {
			this.projectType = ProjectType.ts;
			fnInitialize = this._initializeTS.bind(this);
		}

		return Progress.show(async () => {
			try {
				await fnInitialize(context);
			} catch (error) {
				console.error(error);
				this.registerFallbackCommands();
			}
		}, "Initializing");
	}
	private async _initialize(context: vscode.ExtensionContext) {
		const globalStoragePath = context.globalStorageUri.fsPath;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});
		const parser = AbstractUI5Parser.getInstance<UI5Parser, CustomUIClass>(UI5Parser, {
			configHandler: new VSCodeParserConfigHandler()
		});
		CommandRegistrator.register(false, ProjectType.js);
		await parser.initialize(workspaceFolders, globalStoragePath);
		if (UI5Plugin.getInstance().parser.fileReader.getAllManifests().length === 0) {
			this.registerFallbackCommands();
			return;
		}
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
		if (UI5Plugin.getInstance().parser.fileReader.getAllManifests().length === 0) {
			this.registerFallbackCommands();
			return;
		}
		this.parser = parser;

		AbstractUI5Parser.getInstance(UI5TSParser)
			.classFactory.getAllCustomUIClasses()
			.forEach(UIClass => {
				AbstractUI5Parser.getInstance(UI5TSParser).classFactory.enrichTypesInCustomClass(UIClass);
			});

		FileWatcherMediator.register();
		CommandRegistrator.register(true, ProjectType.ts);
		CommandRegistrator.registerUniqueCommands();
		CodeActionRegistrator.registerTS();
		CodeLensRegistrator.register(ProjectType.ts);
		CompletionItemRegistrator.registerTS();
		DefinitionProviderRegistrator.registerTS();
		HoverRegistrator.registerTS();
		XMLFormatterRegistrator.register();
		DiagnosticsRegistrator.register(ProjectType.ts);
		JSRenameRegistrator.registerTS();
		TreeDataProviderRegistrator.register();
	}

	registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}

	projectType: ProjectType = ProjectType.js;
}

export enum ProjectType {
	ts,
	js
}
