import * as vscode from "vscode";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import { UI5Plugin } from "../../UI5Plugin";
import { FileRenameMediator } from "../filerenaming/FileRenameMediator";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { WorkspaceCompletionItemFactory } from "../providers/completionitems/factories/js/sapuidefine/WorkspaceCompletionItemFactory";
import { IFileChanges, IFileRenameData } from "../filerenaming/handlers/abstraction/FileRenameHandler";
import { TemplateGeneratorFactory } from "../templateinserters/filetemplates/factory/TemplateGeneratorFactory";
import { ResourceModelData } from "ui5plugin-parser/dist/classes/UI5Classes/ResourceModelData";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { VSCodeFileReader } from "./VSCodeFileReader";
import { DiagnosticsRegistrator } from "../registrators/DiagnosticsRegistrator";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IReferenceCodeLensCacheable } from "ui5plugin-linter/dist/classes/js/parts/util/ReferenceFinder";
import { PackageLinterConfigHandler } from "ui5plugin-linter";
import { PackageParserConfigHandler } from "ui5plugin-parser";
import { ICacheable } from "ui5plugin-parser/dist/classes/UI5Classes/abstraction/ICacheable";

const workspace = vscode.workspace;

export class FileWatcherMediator {
	private static _nextInQueue: { [key: string]: { timeoutId?: NodeJS.Timeout, classNameDotNotation: string, classFileText: string, force: boolean } } = {};
	private static async _onChange(uri: vscode.Uri, document?: vscode.TextDocument, force = true) {
		if (!document) {
			document = await vscode.workspace.openTextDocument(uri);
		}
		if (document.fileName.endsWith(".js")) {
			const currentClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
			if (currentClassNameDotNotation) {
				if (!FileWatcherMediator._nextInQueue[currentClassNameDotNotation]?.timeoutId) {
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation] = { classFileText: document.getText(), classNameDotNotation: currentClassNameDotNotation, force: force };
					FileWatcherMediator._nextInQueue[currentClassNameDotNotation].timeoutId = setTimeout(() => {
						if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
							UI5Plugin.getInstance().parser.classFactory.setNewCodeForClass(
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classNameDotNotation,
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classFileText,
								FileWatcherMediator._nextInQueue[currentClassNameDotNotation].force
							);
							delete FileWatcherMediator._nextInQueue[currentClassNameDotNotation];
						}
					}, 50);

					if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
						UI5Plugin.getInstance().parser.classFactory.setNewCodeForClass(
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classNameDotNotation,
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].classFileText,
							FileWatcherMediator._nextInQueue[currentClassNameDotNotation].force
						);
					}
				} else if (FileWatcherMediator._nextInQueue[currentClassNameDotNotation]) {
					const cache = FileWatcherMediator._nextInQueue[currentClassNameDotNotation];
					cache.classFileText = document.getText();
					cache.classNameDotNotation = currentClassNameDotNotation;
					cache.force = cache.force || force;
				}

			}
		} else if (document.fileName.endsWith(".view.xml")) {

			const viewContent = document.getText();
			UI5Plugin.getInstance().parser.fileReader.setNewViewContentToCache(viewContent, document.uri.fsPath, true);
		} else if (document.fileName.endsWith(".fragment.xml")) {

			UI5Plugin.getInstance().parser.fileReader.setNewFragmentContentToCache(document.getText(), document.fileName, true);
		} else if (document.fileName.endsWith(".properties")) {

			ResourceModelData.updateCache(new TextDocumentAdapter(document));
		} else if (document.fileName.endsWith("manifest.json")) {

			UI5Plugin.getInstance().parser.fileReader.rereadAllManifests(vscode.workspace.workspaceFolders?.map(wsFolder => {
				return { fsPath: wsFolder.uri.fsPath };
			}) || []);
		} else if (document.fileName.endsWith("package.json")) {
			delete PackageLinterConfigHandler.packageCache[document.fileName];
			delete PackageParserConfigHandler.packageCache[document.fileName];
		}

		this._updateDiagnosticsIfNecessary(document);
	}

	private static _updateDiagnosticsIfNecessary(changedDocument: vscode.TextDocument) {
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument) {
			const supportedExtensions = [".js", ".view.xml", ".fragment.xml"];
			if (supportedExtensions.some(ext => changedDocument.fileName.endsWith(ext))) {
				const isDiagnosticDirty = this._checkIfDiagnosticIsDirty(changedDocument);
				if (isDiagnosticDirty && activeDocument) {
					DiagnosticsRegistrator.updateDiagnosticCollection(activeDocument);
				}
			}
		}
	}

	private static _checkIfDiagnosticIsDirty(changedDocument: vscode.TextDocument) {
		let changedClassHasReferencesToActiveClass = false;
		const activeDocument = vscode.window.activeTextEditor?.document;
		const activeDocumentClassName = activeDocument && UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(activeDocument.fileName);
		if (activeDocument && changedDocument.fileName !== activeDocument.fileName && activeDocument && activeDocumentClassName) {
			const cacheable = this._getCacheableInstance(changedDocument);
			const cache = cacheable && cacheable.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
			changedClassHasReferencesToActiveClass = !!Object.keys(cache).find(className => className === activeDocumentClassName);
		}

		return changedClassHasReferencesToActiveClass;
	}
	private static _getCacheableInstance(document: vscode.TextDocument) {
		let cacheable: ICacheable | undefined;
		const activeDocument = vscode.window.activeTextEditor?.document;
		const activeDocumentClassName = activeDocument && UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(activeDocument.fileName);
		const currentClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (activeDocumentClassName && currentClassNameDotNotation) {
			if (document.fileName.endsWith(".js")) {
				const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(currentClassNameDotNotation);
				if (UIClass && UIClass instanceof CustomUIClass) {
					cacheable = UIClass;
				}

			} else if (document.fileName.endsWith(".fragment.xml") || document.fileName.endsWith(".view.xml")) {
				cacheable = UI5Plugin.getInstance().parser.fileReader.getXMLFile(activeDocumentClassName);
			}
		}

		return cacheable;
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

				const currentClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(uri.fsPath);
				if (currentClassNameDotNotation) {
					UI5Plugin.getInstance().parser.classFactory.removeClass(currentClassNameDotNotation);
				}
			} else if (uri.fsPath.endsWith(".xml")) {
				UI5Plugin.getInstance().parser.fileReader.removeFromCache(uri.fsPath);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.window.onDidChangeActiveTextEditor(textEditor => {
			if (textEditor?.document.fileName.endsWith(".js")) {

				const currentClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(textEditor.document.fileName);
				if (currentClassNameDotNotation) {
					UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(textEditor.document));
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
				UI5Plugin.getInstance().parser.fileReader.setNewFragmentContentToCache(changedFile.fileData.content, changedFile.fileData.fsPath, true);
			} else if (changedFile.fileData.fsPath.endsWith(".view.xml")) {
				UI5Plugin.getInstance().parser.fileReader.setNewViewContentToCache(changedFile.fileData.content, changedFile.fileData.fsPath, true);
			} else if (changedFile.fileData.fsPath.endsWith("manifest.json")) {
				UI5Plugin.getInstance().parser.fileReader.rereadAllManifests(vscode.workspace.workspaceFolders?.map(wsFolder => {
					return { fsPath: wsFolder.uri.fsPath };
				}) || []);
			}
		}

		changedFiles.forEach(changedFile => {
			if (changedFile.fileData.fsPath.endsWith(".js")) {
				const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(changedFile.fileData.fsPath);
				if (className) {
					UI5Plugin.getInstance().parser.classFactory.setNewCodeForClass(className, changedFile.fileData.content);
				}
			}
		});

		renames.forEach(rename => {
			const oldUri = vscode.Uri.file(rename.oldFSPath);
			const newUri = vscode.Uri.file(rename.newFSPath);
			edit.renameFile(oldUri, newUri);
		});

		await vscode.workspace.applyEdit(edit);
	}

	private static _handleFileRename(file: {
		oldUri: vscode.Uri;
		newUri: vscode.Uri;
	}, fileChanges = this.getFileChangeData()) {
		return FileRenameMediator.handleFileRename(file, fileChanges);
	}

	public static getFileChangeData(): IFileChanges[] {
		return VSCodeFileReader.getAllFilesInAllWorkspaces().map(fileData => {
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