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
import { glob } from "glob";
import * as path from "path";
import * as ts from "typescript";
import { readFileSync } from "fs";
import { generateDocumentation } from "./typescript/Test";
import watchMain = require("./typescript/Test");


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
		if (this._getIsTypescriptProject()) {
			// const delint = function(sourceFile: ts.SourceFile) {
			// 	delintNode(sourceFile);

			// 	function delintNode(node: ts.Node) {
			// 		switch (node.kind) {
			// 			case ts.SyntaxKind.ForStatement:
			// 			case ts.SyntaxKind.ForInStatement:
			// 			case ts.SyntaxKind.WhileStatement:
			// 			case ts.SyntaxKind.DoStatement:
			// 				if ((node as ts.IterationStatement).statement.kind !== ts.SyntaxKind.Block) {
			// 					report(
			// 						node,
			// 						'A looping statement\'s contents should be wrapped in a block body.'
			// 					);
			// 				}
			// 				break;

			// 			case ts.SyntaxKind.IfStatement:
			// 				const ifStatement = node as ts.IfStatement;
			// 				if (ifStatement.thenStatement.kind !== ts.SyntaxKind.Block) {
			// 					report(ifStatement.thenStatement, 'An if statement\'s contents should be wrapped in a block body.');
			// 				}
			// 				if (
			// 					ifStatement.elseStatement &&
			// 					ifStatement.elseStatement.kind !== ts.SyntaxKind.Block &&
			// 					ifStatement.elseStatement.kind !== ts.SyntaxKind.IfStatement
			// 				) {
			// 					report(
			// 						ifStatement.elseStatement,
			// 						'An else statement\'s contents should be wrapped in a block body.'
			// 					);
			// 				}
			// 				break;

			// 			case ts.SyntaxKind.BinaryExpression:
			// 				const op = (node as ts.BinaryExpression).operatorToken.kind;
			// 				if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
			// 					report(node, 'Use \'===\' and \'!==\'.');
			// 				}
			// 				break;
			// 		}

			// 		ts.forEachChild(node, delintNode);
			// 	}

			// 	function report(node: ts.Node, message: string) {
			// 		const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			// 		console.log(`${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`);
			// 	}
			// }

			// const workspaces =  vscode.workspace.workspaceFolders?.map(wsFolder => wsFolder.uri.fsPath) || [];
			// const fileNames = workspaces.map(workspace => workspace + "\\src\\Component.ts");
			// fileNames.forEach(fileName => {
			// 	// Parse a file
			// 	const sourceFile = ts.createSourceFile(
			// 		fileName,
			// 		readFileSync(fileName).toString(),
			// 		ts.ScriptTarget.ES2015,
			// 	  	true
			// 	);

			// 	// delint it
			// 	delint(sourceFile);
			// });
			// class MyCompilerHost extends MyLanguageServiceHost implements ts.CompilerHost {
			// 	getSourceFile(filename: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
			// 		var f = this.files[filename];
			// 		if (!f) return null;
			// 		var sourceFile = ts.createLanguageServiceSourceFile(filename, f.file, ts.ScriptTarget.ES5, f.ver.toString(), true, false);
			// 		return sourceFile;
			// 	}
			// 	writeFile(filename: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void {
			// 	}
			// 	getCanonicalFileName = (fileName: string) => fileName;
			// 	useCaseSensitiveFileNames = () => true;
			// 	getNewLine = () => "\n";
			// }
			const folderPaths = vscode.workspace.workspaceFolders?.map(wsFolder => wsFolder.uri.fsPath) || [];
			watchMain(folderPaths[0]);

			// const tsconfig = import("../tsconfig.json");
			// generateDocumentation(components, {

			UI5Plugin.pWhenPluginInitialized = new Promise((resolve) => resolve());
		} else {
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
		}

		return UI5Plugin.pWhenPluginInitialized;
	}
	private _getIsTypescriptProject() {
		const escapedFileSeparator = "\\" + path.sep;
		const workspaceFolders = vscode.workspace.workspaceFolders?.map(wsFolder => {
			return new WorkspaceFolder(wsFolder.uri.fsPath);
		});

		const components = workspaceFolders?.flatMap(wsFolder => {
			const oConfigHandler = new VSCodeParserConfigHandler();
			const wsFolderFSPath = wsFolder.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const exclusions: string[] = oConfigHandler.getExcludeFolderPatterns();
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`
			});
			return glob.sync(`${wsFolderFSPath}/**/Component.ts`, {
				ignore: exclusionPaths
			});
		})

		return !!components?.length || false;
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