import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { ResourceModelData } from "../UI5Classes/ResourceModelData";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import { UI5Plugin } from "../../UI5Plugin";
import { FileRenameMediator } from "../filerenaming/FileRenameMediator";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { DiagnosticsRegistrator } from "../registrators/DiagnosticsRegistrator";
import { WorkspaceCompletionItemFactory } from "../providers/completionitems/factories/js/sapuidefine/WorkspaceCompletionItemFactory";
import { IFileChanges, IFileRenameData } from "../filerenaming/handlers/abstraction/FileRenameHandler";
import { TemplateGeneratorFactory } from "../templateinserters/filetemplates/TemplateGeneratorFactory";

const workspace = vscode.workspace;

export class FileWatcherMediator {
	private static _nextInQueue: { [key: string]: { timeoutId?: NodeJS.Timeout, classNameDotNotation: string, classFileText: string, force: boolean } } = {};
	private static async _onChange(uri: vscode.Uri, document?: vscode.TextDocument, force = true) {
		if (!document) {
			document = await vscode.workspace.openTextDocument(uri);
		}
		if (document.fileName.endsWith(".js")) {
			const currentClassNameDotNotation = FileReader.getClassNameFromPath(document.fileName);
			if (currentClassNameDotNotation) {
				if (!FileWatcherMediator._nextInQueue[currentClassNameDotNotation]?.timeoutId) {
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation] = { classFileText: document.getText(), classNameDotNotation: currentClassNameDotNotation, force: force };
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation].timeoutId = setTimeout(() => {
						if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
							UIClassFactory.setNewCodeForClass(
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classNameDotNotation,
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classFileText,
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].force
							);
							delete FileWatcherMediator._nextInQueue[currentClassNameDotNotation];
						}
					}, 50);

					if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
						UIClassFactory.setNewCodeForClass(
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classNameDotNotation,
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classFileText,
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].force
						);
					}
				} else if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classFileText = document.getText();
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classNameDotNotation = currentClassNameDotNotation;
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation].force = force
				}

			}
		} else if (document.fileName.endsWith(".view.xml")) {

			const viewContent = document.getText();
			FileReader.setNewViewContentToCache(viewContent, document.uri.fsPath, true);
		} else if (document.fileName.endsWith(".fragment.xml")) {

			FileReader.setNewFragmentContentToCache(document.getText(), document.fileName, true);
		} else if (document.fileName.endsWith(".properties")) {

			ResourceModelData.readTexts();
		} else if (document.fileName.endsWith("manifest.json")) {

			FileReader.rereadAllManifests();
		}
	}
	static register() {
		const watcher = vscode.workspace.createFileSystemWatcher("**/*.{js,xml,json,properties}");
		let disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			ClearCacheCommand.reloadWindow();
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length) {
				this._onChange(event.document.uri, event.document, false);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = watcher.onDidChange((uri: vscode.Uri) => {
			this._onChange(uri, undefined, false);
		});
		UI5Plugin.getInstance().addDisposable(disposable);
		disposable = watcher.onDidCreate(uri => {
			this._handleFileCreate(uri);
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				let fileChanges: IFileChanges[] = [];
				if (file.newUri.fsPath.indexOf(".") === -1) {
					fileChanges = this._handleFolderRename(file.oldUri, file.newUri);
				} else {
					fileChanges = this._handleFileRename(file);
				}

				if (fileChanges) {
					this._applyFileChanges(fileChanges);
				}
			});
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		watcher.onDidDelete(uri => {
			if (uri.fsPath.endsWith(".js")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "js");
			}
			if (uri.fsPath.endsWith(".xml")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "xml");
			}
			if (uri.fsPath.endsWith(".properties")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "properties");
			}

			if (uri.fsPath.endsWith(".js")) {

				const currentClassNameDotNotation = FileReader.getClassNameFromPath(uri.fsPath);
				if (currentClassNameDotNotation) {
					UIClassFactory.removeClass(currentClassNameDotNotation);
				}
			} else if (uri.fsPath.endsWith(".xml")) {
				FileReader.removeFromCache(uri.fsPath);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.window.onDidChangeActiveTextEditor(textEditor => {
			if (textEditor?.document.fileName.endsWith(".js")) {

				const currentClassNameDotNotation = FileReader.getClassNameFromPath(textEditor.document.fileName);
				if (currentClassNameDotNotation) {
					UIClassFactory.setNewContentForClassUsingDocument(textEditor.document);
				}
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}

	private static async _applyFileChanges(fileChanges: IFileChanges[]) {
		const edit = new vscode.WorkspaceEdit();
		const changedTextDocuments: vscode.TextDocument[] = [];
		const renames: IFileRenameData[] = [];

		fileChanges.forEach(changedFile => {
			if (changedFile.renames) {
				renames.push(...changedFile.renames);
			}
		});

		const changedFiles = fileChanges.filter(fileChange => fileChange.changed);
		for (const changedFile of changedFiles) {
			const document = await vscode.workspace.openTextDocument(changedFile.fileData.fsPath);
			changedTextDocuments.push(document);
			const positionBegin = document.positionAt(0);
			const positionEnd = document.positionAt(document.getText().length);
			const range = new vscode.Range(positionBegin, positionEnd);
			edit.replace(document.uri, range, changedFile.fileData.content);

			if (changedFile.fileData.fsPath.endsWith(".fragment.xml")) {
				FileReader.setNewFragmentContentToCache(changedFile.fileData.content, changedFile.fileData.fsPath, true);
			} else if (changedFile.fileData.fsPath.endsWith(".view.xml")) {
				FileReader.setNewViewContentToCache(changedFile.fileData.content, changedFile.fileData.fsPath, true);
			} else if (changedFile.fileData.fsPath.endsWith("manifest.json")) {
				FileReader.rereadAllManifests();
			}
		}

		changedFiles.forEach(changedFile => {
			if (changedFile.fileData.fsPath.endsWith(".js")) {
				const className = FileReader.getClassNameFromPath(changedFile.fileData.fsPath);
				if (className) {
					UIClassFactory.setNewCodeForClass(className, changedFile.fileData.content);
				}
			}
		});

		renames.forEach(rename => {
			const oldUri = vscode.Uri.file(rename.oldFSPath);
			const newUri = vscode.Uri.file(rename.newFSPath);
			edit.renameFile(oldUri, newUri);
		});

		await vscode.workspace.applyEdit(edit);
		setTimeout(() => {
			const activeDocument = vscode.window.activeTextEditor?.document;
			if (activeDocument) {
				DiagnosticsRegistrator.updateDiagnosticCollection(activeDocument);
			}
		}, 100);

	}

	private static _handleFileRename(file: {
		oldUri: vscode.Uri;
		newUri: vscode.Uri;
	}, fileChanges = this.getFileChangeData()) {
		return FileRenameMediator.handleFileRename(file, fileChanges);
	}

	public static getFileChangeData(): IFileChanges[] {
		return FileReader.getAllFilesInAllWorkspaces().map(fileData => {
			return {
				fileData,
				changed: false,
				renames: []
			}
		});
	}

	//TODO: Move to js completion items
	public static synchronizeSAPUIDefineCompletionItems(completionItems: CustomCompletionItem[]) {
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

	private static _handleFileCreate(uri: vscode.Uri) {
		this._insertCodeTemplate(uri);
	}

	private static async _insertCodeTemplate(uri: vscode.Uri) {
		const document = await vscode.workspace.openTextDocument(uri);
		if (document.getText().length === 0) {
			const templateInserter = TemplateGeneratorFactory.createInstance(uri.fsPath);
			const textToInsert = templateInserter?.generateTemplate(uri);
			if (textToInsert) {
				const edit = new vscode.WorkspaceEdit();
				edit.insert(uri, new vscode.Position(0, 0), textToInsert);
				vscode.workspace.applyEdit(edit);
			}
		}
	}

	private static _handleFolderRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const fileChanges = this.getFileChangeData();
		FileRenameMediator.handleFolderRename(oldUri, newUri, fileChanges);

		return fileChanges;
	}
}