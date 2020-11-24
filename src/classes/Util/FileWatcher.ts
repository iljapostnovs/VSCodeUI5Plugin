import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { AcornSyntaxAnalyzer } from "../CustomLibMetadata/JSParser/AcornSyntaxAnalyzer";
import * as glob from "glob";
import * as fs from "fs";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { WorkspaceCompletionItemFactory } from "../CompletionItems/completionitemfactories/WorkspaceCompletionItemFactory";
import { ResourceModelData } from "../CustomLibMetadata/ResourceModelData";
import { ClearCacheCommand } from "../VSCommands/ClearCacheCommand";
import { UI5Plugin } from "../../UI5Plugin";
import * as path from "path";
import { TemplateGeneratorFactory } from "../templateinserters/TemplateGeneratorFactory";
import { FileRenameMediator } from "../filerenaming/FileRenameMediator";
const fileSeparator = path.sep;
const workspace = vscode.workspace;

export class FileWatcher {
	static register() {
		let disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			ClearCacheCommand.reloadWindow();
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidSaveTextDocument(document => {
			if (document.fileName.endsWith(".js")) {

				const currentClassNameDotNotation = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.getText());
				if (currentClassNameDotNotation) {
					UIClassFactory.setNewCodeForClass(currentClassNameDotNotation, document.getText());
				}
			} else if (document.fileName.endsWith(".view.xml")) {

				let viewContent = document.getText();
				viewContent = FileReader.replaceFragments(viewContent);
				FileReader.setNewViewContentToCache(viewContent, document.uri.fsPath);
			} else if (document.fileName.endsWith(".properties")) {

				ResourceModelData.readTexts();
			} else if (document.fileName.endsWith("manifest.json")) {

				FileReader.rereadAllManifests();
			}
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidCreateFiles(event => {
			event.files.forEach(this.handleFileCreate.bind(this));
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				if (file.newUri.fsPath.indexOf(".") === -1) {
					this.handleFolderRename(file.oldUri, file.newUri);
				} else {
					this.handleFileRename(file);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}

	private static handleFileRename(file: {
		oldUri: vscode.Uri;
		newUri: vscode.Uri;
	}) {
		FileRenameMediator.handleFileRename(file);
	}

	public static synchronizeJSDefineCompletionItems(completionItems: vscode.CompletionItem[]) {
		let disposable = workspace.onDidCreateFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchronizeCreate(completionItems, file);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidDeleteFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchronizeDelete(completionItems, file);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				if (file.newUri.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchronizeCreate(completionItems, file.newUri);
					WorkspaceCompletionItemFactory.synchronizeDelete(completionItems, file.oldUri);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}

	private static handleFileCreate(uri: vscode.Uri) {
		const changedFileText = fs.readFileSync(uri.fsPath, "utf8");

		const thisFileIsEmpty = changedFileText.length === 0;

		if (thisFileIsEmpty) {
			this.insertCodeTemplate(uri);
		}
	}

	private static insertCodeTemplate(uri: vscode.Uri) {
		const templateInserter = TemplateGeneratorFactory.createInstance(uri.fsPath);
		const textToInsert = templateInserter?.generateTemplate(uri);
		if (textToInsert) {
			fs.writeFileSync(uri.fsPath, textToInsert);
		}
	}

	private static handleFolderRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const newFilePaths = glob.sync(newUri.fsPath.replace(/\//g, fileSeparator) + "/**/*{.js,.xml}");
		newFilePaths.forEach(filePath => {
			const newFileUri = vscode.Uri.file(filePath);
			const oldFileUri = vscode.Uri.file(
				filePath
				.replace(/\//g, fileSeparator)
				.replace(
					newUri.fsPath.replace(/\//g, fileSeparator),
					oldUri.fsPath.replace(/\//g, fileSeparator)
				)
			);

			this.handleFileRename({
				newUri: newFileUri,
				oldUri: oldFileUri
			});
		});
	}
}