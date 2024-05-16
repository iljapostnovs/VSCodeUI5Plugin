import { PackageLinterConfigHandler } from "ui5plugin-linter";
import { PackageParserConfigHandler, ParserPool, toNative, UI5TSParser } from "ui5plugin-parser";
import { ICacheable } from "ui5plugin-parser/dist/classes/parsing/abstraction/ICacheable";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IReferenceCodeLensCacheable } from "ui5plugin-parser/dist/classes/parsing/util/referencefinder/ReferenceFinderBase";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { FileRenameMediator } from "../filerenaming/FileRenameMediator";
import { IFileChanges, IFileRenameData } from "../filerenaming/handlers/abstraction/FileRenameHandler";
import { DiagnosticsRegistrator } from "../registrators/DiagnosticsRegistrator";
import { TemplateGeneratorFactory } from "../templateinserters/filetemplates/factory/TemplateGeneratorFactory";
import { ClearCacheCommand } from "../vscommands/ClearCacheCommand";
import EventBus from "./EventBus";
import { VSCodeFileReader } from "./VSCodeFileReader";
import path = require("path");

const workspace = vscode.workspace;

export class FileWatcherMediator {
	private static readonly _parsingTimeout: Record<string, NodeJS.Timeout> = {};
	private async _onChange(
		uri: vscode.Uri,
		document?: vscode.TextDocument,
		force = true,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		contentChanges?: Readonly<vscode.TextDocumentContentChangeEvent[]>
	) {
		if (!document) {
			document = await vscode.workspace.openTextDocument(uri);
		}

		const configFiles = [
			".ui5pluginrc",
			".ui5pluginrc.json",
			".ui5pluginrc.yaml",
			".ui5pluginrc.yml",
			".ui5pluginrc.js",
			"package.json"
		];
		if (configFiles.some(file => document?.fileName.endsWith(file))) {
			const dirName = path.dirname(document.fileName);
			const nativePath = toNative(dirName + "/package.json");
			delete PackageLinterConfigHandler.configCache[nativePath];
			delete PackageParserConfigHandler.configCache[nativePath];
			// if (contentChanges) {
			// const contentChange = contentChanges[0];
			// const changeOffset = contentChange.rangeOffset;
			// const oldPackage = PackageParserConfigHandler.configCache[nativePath];
			// if in ui5parser, then reload
			// }

			const parsers = ParserPool.getAllParsers();
			parsers.forEach(parser => {
				if (parser.configHandler instanceof PackageParserConfigHandler) {
					parser.configHandler.loadCache();
				}
			});
		}
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser) {
			return;
		}
		if (document.fileName.endsWith(".js") || document.fileName.endsWith(".ts")) {
			const currentClassNameDotNotation = parser.fileReader.getClassNameFromPath(document.fileName);
			if (currentClassNameDotNotation) {
				const UIClass = parser.classFactory.getUIClass(currentClassNameDotNotation) as AbstractCustomClass;
				const textChanged =
					force ||
					UIClass.classText.length !== document.getText().length ||
					UIClass.classText !== document.getText();
				if (FileWatcherMediator._parsingTimeout[document.fileName]) {
					clearTimeout(FileWatcherMediator._parsingTimeout[document.fileName]);
				}

				FileWatcherMediator._parsingTimeout[document.fileName] = setTimeout(() => {
					if (!document) {
						return;
					}
					if (document.fileName.endsWith(".ts") && parser instanceof UI5TSParser) {
						// const textChanges: ts.TextChange[] | undefined = contentChanges?.map(contentChange => {
						// 	return {
						// 		newText: contentChange.text,
						// 		span: { length: contentChange.rangeLength, start: contentChange.rangeOffset }
						// 	};
						// });
						parser.classFactory.setNewCodeForClass(
							currentClassNameDotNotation,
							document.getText(),
							force,
							undefined,
							undefined,
							true,
							undefined
							// textChanges
						);
					} else {
						parser.classFactory.setNewCodeForClass(currentClassNameDotNotation, document.getText(), force);
					}

					if (textChanged || force) {
						EventBus.fireCodeUpdated(document);
					}

					delete FileWatcherMediator._parsingTimeout[document.fileName];
				}, vscode.workspace.getConfiguration("ui5.plugin").get<number>("parsingDelay"));
			}
		} else if (document.fileName.endsWith(".view.xml")) {
			const viewContent = document.getText();
			parser.fileReader.setNewViewContentToCache(viewContent, toNative(document.uri.fsPath), true);

			EventBus.fireCodeUpdated(document);
		} else if (document.fileName.endsWith(".fragment.xml")) {
			parser.fileReader.setNewFragmentContentToCache(document.getText(), toNative(document.fileName), true);

			EventBus.fireCodeUpdated(document);
		} else if (document.fileName.endsWith("18n.properties")) {
			parser.resourceModelData.updateCache(new TextDocumentAdapter(document));

			EventBus.fireCodeUpdated(document);
		} else if (document.fileName.endsWith("manifest.json")) {
			parser.fileReader.rereadAllManifests();

			EventBus.fireCodeUpdated(document);
		}

		this._updateDiagnosticsIfNecessary(document);
	}

	private _updateDiagnosticsIfNecessary(changedDocument: vscode.TextDocument) {
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument) {
			const supportedExtensions = [".js", ".ts", ".view.xml", ".fragment.xml"];
			if (supportedExtensions.some(ext => changedDocument.fileName.endsWith(ext))) {
				const isDiagnosticDirty = this._checkIfDiagnosticIsDirty(changedDocument);
				if (isDiagnosticDirty && activeDocument) {
					DiagnosticsRegistrator.updateDiagnosticCollection(activeDocument);
				}
			}
		}
	}

	private _checkIfDiagnosticIsDirty(changedDocument: vscode.TextDocument) {
		let changedClassHasReferencesToActiveClass = false;
		const activeDocument = vscode.window.activeTextEditor?.document;
		const parser = ParserPool.getParserForFile(changedDocument.fileName);
		if (!parser) {
			return;
		}
		const activeDocumentClassName =
			activeDocument && parser.fileReader.getClassNameFromPath(activeDocument.fileName);
		if (
			activeDocument &&
			changedDocument.fileName !== activeDocument.fileName &&
			activeDocument &&
			activeDocumentClassName
		) {
			const cacheable = this._getCacheableInstance(changedDocument);
			const cache =
				(cacheable && cacheable.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache")) || {};
			changedClassHasReferencesToActiveClass = !!Object.keys(cache).find(
				className => className === activeDocumentClassName
			);
		}

		return changedClassHasReferencesToActiveClass;
	}
	private _getCacheableInstance(document: vscode.TextDocument) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser) {
			return;
		}
		let cacheable: ICacheable | undefined;
		const activeDocument = vscode.window.activeTextEditor?.document;
		const activeDocumentClassName =
			activeDocument && parser.fileReader.getClassNameFromPath(activeDocument.fileName);
		const currentClassNameDotNotation = parser.fileReader.getClassNameFromPath(document.fileName);
		if (activeDocumentClassName && currentClassNameDotNotation) {
			if (document.fileName.endsWith(".js") || document.fileName.endsWith(".ts")) {
				const UIClass = parser.classFactory.getUIClass(currentClassNameDotNotation);
				if (UIClass && UIClass instanceof CustomJSClass) {
					cacheable = UIClass;
				}
			} else if (document.fileName.endsWith(".fragment.xml") || document.fileName.endsWith(".view.xml")) {
				cacheable = parser.fileReader.getXMLFile(activeDocumentClassName);
			}
		}

		return cacheable;
	}

	register() {
		const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(
			"**/*.{js,ts,xml,json,properties}"
		);
		let disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			ClearCacheCommand.reloadWindow();
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length) {
				this._onChange(event.document.uri, event.document, false, event.contentChanges);
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

		disposable = workspace.onDidSaveTextDocument(document => {
			this._executeGenerateTSXMLInterfacesCommand(document);
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		watcher.onDidDelete(uri => {
			const parser = ParserPool.getParserForFile(uri.fsPath);
			if (uri.fsPath.endsWith(".js")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "js");
			}
			if (uri.fsPath.endsWith(".ts") && parser instanceof UI5TSParser) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "ts");
				const project = parser.getProject(uri.fsPath);
				const sourceFile = project?.getSourceFile(uri.fsPath);
				if (sourceFile) {
					project?.removeSourceFile(sourceFile);
				}
			}
			if (uri.fsPath.endsWith(".xml")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "xml");
			}
			if (uri.fsPath.endsWith(".properties")) {
				DiagnosticsRegistrator.removeDiagnosticForUri(uri, "properties");
			}

			if (uri.fsPath.endsWith(".js") || uri.fsPath.endsWith(".ts")) {
				const currentClassNameDotNotation = parser?.fileReader.getClassNameFromPath(uri.fsPath);
				if (currentClassNameDotNotation) {
					parser?.classFactory.removeClass(currentClassNameDotNotation);
				}
			} else if (uri.fsPath.endsWith(".xml")) {
				parser?.fileReader.removeFromCache(uri.fsPath);
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.window.onDidChangeActiveTextEditor(textEditor => {
			const parser = textEditor && ParserPool.getParserForFile(textEditor?.document.fileName);
			if (!textEditor || !parser) {
				return;
			}

			if (textEditor.document.fileName.endsWith(".js") || textEditor.document.fileName.endsWith(".ts")) {
				const currentClassNameDotNotation = parser.fileReader.getClassNameFromPath(
					textEditor.document.fileName
				);
				if (currentClassNameDotNotation) {
					parser.classFactory.setNewContentForClassUsingDocument(
						new TextDocumentAdapter(textEditor.document)
					);
				}
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}

	private _executeGenerateTSXMLInterfacesCommand(document: vscode.TextDocument) {
		const textDocument = new TextDocumentAdapter(document);
		if (textDocument.isXML()) {
			const ui5PluginConfiguration = vscode.workspace.getConfiguration("ui5.plugin");
			const isSavingRequired = ui5PluginConfiguration.get<boolean>("generateXMLFileInterfacesOnSave");
			const isXMLFileInterfacePathSet = !!ui5PluginConfiguration.get<string>("XMLFileInterfacePath");
			if (isSavingRequired && isXMLFileInterfacePathSet) {
				return vscode.commands.executeCommand("ui5plugin.generateTSXMLFileInterfaces", {
					shouldOpenDocument: false
				});
			}
		}
	}

	private async _applyFileChanges(fileChanges: IFileChanges[]) {
		const textEdit = new vscode.WorkspaceEdit();
		const changedTextDocuments: vscode.TextDocument[] = [];
		const renames: IFileRenameData[] = fileChanges.flatMap(fileChange => {
			return fileChange.renames;
		});

		const changedFiles = fileChanges.filter(fileChange => fileChange.changed);
		for (const changedFile of changedFiles) {
			const document = await vscode.workspace.openTextDocument(changedFile.fileData.fsPath);
			changedTextDocuments.push(document);
			const positionBegin = document.positionAt(0);
			const positionEnd = document.positionAt(document.getText().length);
			const range = new vscode.Range(positionBegin, positionEnd);
			textEdit.replace(document.uri, range, changedFile.fileData.content);

			const parser = ParserPool.getParserForFile(changedFile.fileData.fsPath);
			if (parser) {
				if (changedFile.fileData.fsPath.endsWith(".fragment.xml")) {
					parser.fileReader.setNewFragmentContentToCache(
						changedFile.fileData.content,
						toNative(changedFile.fileData.fsPath),
						true
					);
				} else if (changedFile.fileData.fsPath.endsWith(".view.xml")) {
					parser.fileReader.setNewViewContentToCache(
						changedFile.fileData.content,
						toNative(changedFile.fileData.fsPath),
						true
					);
				} else if (changedFile.fileData.fsPath.endsWith("manifest.json")) {
					parser.fileReader.rereadAllManifests();
				}
			}
		}

		changedFiles.forEach(changedFile => {
			const parser = ParserPool.getParserForFile(changedFile.fileData.fsPath);
			if (changedFile.fileData.fsPath.endsWith(".js") || changedFile.fileData.fsPath.endsWith(".ts")) {
				const className = parser?.fileReader.getClassNameFromPath(changedFile.fileData.fsPath);
				if (className) {
					parser?.classFactory.setNewCodeForClass(className, changedFile.fileData.content);
				}
			}
		});

		await vscode.workspace.applyEdit(textEdit);

		if (renames.length > 0) {
			const renameEdit = new vscode.WorkspaceEdit();
			renames.forEach(rename => {
				const oldUri = vscode.Uri.file(rename.oldFSPath);
				const newUri = vscode.Uri.file(rename.newFSPath);
				renameEdit.renameFile(oldUri, newUri);
			});
			await vscode.workspace.applyEdit(renameEdit);
		}
	}

	private _handleFileRename(
		file: {
			oldUri: vscode.Uri;
			newUri: vscode.Uri;
		},
		fileChanges = this.getFileChangeData()
	) {
		const parser = ParserPool.getParserForFile(file.oldUri.fsPath);
		return parser ? new FileRenameMediator(parser).handleFileRename(file, fileChanges) : fileChanges;
	}

	public getFileChangeData(): IFileChanges[] {
		return VSCodeFileReader.getAllFilesInAllWorkspaces().map(fileData => {
			return {
				fileData,
				changed: false,
				renames: []
			};
		});
	}

	private _handleFileCreate(uri: vscode.Uri) {
		this._insertCodeTemplateOrSetNewContent(uri);
		this._syncWithProjectCache(uri);
	}

	private async _syncWithProjectCache(uri: vscode.Uri) {
		const document = await vscode.workspace.openTextDocument(uri);
		if (uri.fsPath.endsWith(".js") || uri.fsPath.endsWith(".ts")) {
			const parser = ParserPool.getParserForFile(uri.fsPath);
			if (parser instanceof UI5TSParser) {
				const project = parser.getProject(toNative(uri.fsPath));
				project?.addSourceFileAtPath(toNative(document.fileName));
			}
			parser?.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document), false);
		}
	}

	private async _insertCodeTemplateOrSetNewContent(uri: vscode.Uri) {
		const document = await vscode.workspace.openTextDocument(uri);
		if (document.getText().length === 0) {
			const fsPath = toNative(uri.fsPath);
			const templateInserter = TemplateGeneratorFactory.createInstance(fsPath);
			const textToInsert = templateInserter?.generateTemplate(uri);
			if (textToInsert) {
				const edit = new vscode.WorkspaceEdit();
				edit.insert(uri, new vscode.Position(0, 0), textToInsert);
				vscode.workspace.applyEdit(edit);
			}
		}
	}

	private _handleFolderRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const fileChanges = this.getFileChangeData();
		const parser = ParserPool.getParserForFile(oldUri.fsPath);
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		parser && new FileRenameMediator(parser).handleFolderRename(oldUri, newUri, fileChanges);

		return fileChanges;
	}
}
