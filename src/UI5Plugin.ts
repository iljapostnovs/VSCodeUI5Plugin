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
import glob = require("glob");
import path = require("path");
import * as fs from "fs";
// import { createProgram, parseAndGenerateServices } from "@typescript-eslint/typescript-estree";
import { FileData } from "ui5plugin-parser/dist/classes/utils/FileReader";
import * as ts from "typescript";

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
		const projectType = this._getProjectType();
		if (projectType === ProjectType.Typescript) {
			this._initializeTs();
		} else {
			const globalStoragePath = context.globalStorageUri.fsPath;
			const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
				return new WorkspaceFolder(wsFolder.uri.fsPath);
			})
			const parser = UI5Parser.getInstance({
				configHandler: new VSCodeParserConfigHandler()
			});
			await parser.initialize(workspaceFolders, globalStoragePath);
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
	}

	private _initializeTs() {
		const files = this._getAllTSFiles();

		const workspace = vscode.workspace;
		const root = workspace.workspaceFolders?.[0].uri.fsPath;
		if (root) {
			// const program = createProgram(root + "\\tsconfig.json");
			// const aParsedFiles = files.map(file => {
			// 	const {
			// 		ast,
			// 		services
			// 	} = parseAndGenerateServices(file.content, {
			// 		filePath: file.fsPath,
			// 		loc: true,
			// 		program,
			// 		range: true
			// 	});

			// 	return { ast, services, file };
			// });
			// const ast = aParsedFiles[1].ast;
			// const services = aParsedFiles[1].services;
			// const tsType = services.esTreeNodeToTSNodeMap.get(ast.body[7].declaration.body.body[0].value.body.body[0]);
			// const type = services.program.getTypeChecker().getTypeAtLocation(tsType);
			// const typeChecker = services.program.getTypeChecker();
			// const typeString = typeChecker.typeToString(typeChecker.getTypeAtLocation(tsType));
			console.time("Parsing TS");
			const filePaths = files.map(file => file.fsPath);
			const program = ts.createProgram(filePaths, {});
			files.forEach(file => {
				const filename = file.fsPath;
				const sourceFile = program.getSourceFile(filename);
				const typeChecker = program.getTypeChecker();

				function recursivelyPrintVariableDeclarations(
					node: ts.Node, sourceFile: ts.SourceFile
				) {
					if (node.kind === ts.SyntaxKind.VariableDeclaration) {
						const nodeText = node.getText(sourceFile);
						const type = typeChecker.getTypeAtLocation(node);
						const typeName = typeChecker.typeToString(type, node);

						console.log(nodeText);
						console.log(`(${typeName})`);
					}

					node.forEachChild(child =>
						recursivelyPrintVariableDeclarations(child, sourceFile)
					);
				}

				if (sourceFile) {
					recursivelyPrintVariableDeclarations(sourceFile, sourceFile);
				}
			});
			console.timeEnd("Parsing TS");
		}

		// const tsType = services.esTreeNodeToTSNodeMap.get(ast.body[5].declaration.body.body[0].value.body.body[1]);
		// const type = services.program.getTypeChecker().getTypeAtLocation(tsType);
		// const typeChecker = services.program.getTypeChecker();
		// const typeString = typeChecker.typeToString(typeChecker.getTypeAtLocation(tsType));
	}

	private _getProjectType() {
		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		let projectType = ProjectType.Javascript;

		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath;
			const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`
			});
			const workspaceFilePaths = glob.sync(wsFolderFSPath.replace(/\\/g, "/") + "/**/Component.ts", {
				ignore: exclusionPaths
			});

			if (workspaceFilePaths.length > 0) {
				projectType = ProjectType.Typescript;
			}
		}

		return projectType;
	}

	private _getAllTSFiles() {
		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const files: FileData[] = [];

		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath;
			const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`
			});
			const workspaceFilePaths = glob.sync(wsFolderFSPath.replace(/\\/g, "/") + "/**/*.ts", {
				ignore: exclusionPaths
			});
			workspaceFilePaths.forEach(filePath => {
				const fsPath = path.normalize(filePath);
				const file = fs.readFileSync(fsPath, "utf-8");
				if (file) {
					files.push({
						fsPath,
						content: file
					});
				}
			});
		}

		return files;
	}

	static registerFallbackCommands() {
		CommandRegistrator.registerFallbackCommands();
	}
}
enum ProjectType {
	Javascript,
	Typescript
}