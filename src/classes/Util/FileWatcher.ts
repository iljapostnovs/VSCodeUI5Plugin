import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import * as glob from "glob";
import * as fs from "fs";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { WorkspaceCompletionItemFactory } from "../CompletionItems/completionitemfactories/WorkspaceCompletionItemFactory";
import { ResourceModelData } from "../CustomLibMetadata/ResourceModelData";
import { ClearCacheCommand } from "../VSCommands/ClearCacheCommand";
import { UI5Plugin } from "../../UI5Plugin";
import * as path from "path";
const fileSeparator = path.sep;


const workspace = vscode.workspace;

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class FileWatcher {
	static register() {
		let disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
			ClearCacheCommand.reloadWindow();
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidSaveTextDocument(document => {
			if (document.fileName.endsWith(".js")) {

				const currentClassNameDotNotation = SyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.getText());
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
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					this.handleJSFileCreate(file);
				}
			});
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

		if (file.newUri.fsPath.endsWith(".js")) {
			this.replaceCurrentClassNameWithNewOne(file.oldUri, file.newUri);
		}

		if (file.newUri.fsPath.endsWith(".view.xml")) {
			this.replaceViewNames(file.oldUri, file.newUri);
		}

		if (file.newUri.fsPath.endsWith(".controller.js")) {
			this.renameViewOfController(file.newUri);
		}
	}

	public static syncrhoniseJSDefineCompletionItems(completionItems: vscode.CompletionItem[]) {
		let disposable = workspace.onDidCreateFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseCreate(completionItems, file);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidDeleteFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseDelete(completionItems, file);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				if (file.newUri.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseCreate(completionItems, file.newUri);
					WorkspaceCompletionItemFactory.synchroniseDelete(completionItems, file.oldUri);
				}
			});
		});

		UI5Plugin.getInstance().addDisposable(disposable);
	}

	private static handleJSFileCreate(uri: vscode.Uri) {
		const changedFileText = fs.readFileSync(uri.fsPath, "utf8");

		const thisFileIsEmpty = changedFileText.length === 0;

		if (thisFileIsEmpty) {
			this.insertCodeTemplate(uri);
		}
	}

	private static insertCodeTemplate(uri: vscode.Uri) {
		const textToInsert = this.generateTextToInsertIntoFile(uri);
		fs.writeFileSync(uri.fsPath, textToInsert);
	}

	private static generateTextToInsertIntoFile(uri: vscode.Uri) {
		const isController = uri.fsPath.endsWith(".controller.js");
		const classNameDotNotation = FileReader.getClassNameFromPath(uri.fsPath);

		const standardUIDefineClassForExtension = isController ? "sap/ui/core/mvc/Controller" : "sap/ui/base/ManagedObject";
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];

		return `sap.ui.define([\r\n\t\"${standardUIDefineClassForExtension}\"\r\n], function(\r\n\t${controlName}\r\n) {\r\n\t\"use strict\";\r\n\r\n\treturn ${controlName}.extend(\"${classNameDotNotation}\", {\r\n\t});\r\n});`;
	}

	private static replaceCurrentClassNameWithNewOne(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const oldClassNameDotNotation = FileReader.getClassNameFromPath(oldUri.fsPath);

		if (oldClassNameDotNotation) {
			const newClassNameDotNotation = FileReader.getClassNameFromPath(newUri.fsPath);
			if (newClassNameDotNotation) {
				if (oldClassNameDotNotation !== newClassNameDotNotation) {
					this.replaceAllOccurancesInFiles(oldClassNameDotNotation, newClassNameDotNotation);
				}
			}
		}
	}

	private static replaceViewNames(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const textToReplaceFromDotNotation = FileReader.getClassNameFromPath(oldUri.fsPath)?.replace(".view.xml", "");
		const textToReplaceToDotNotation = FileReader.getClassNameFromPath(newUri.fsPath)?.replace(".view.xml", "");

		if (textToReplaceFromDotNotation && textToReplaceToDotNotation) {
			this.renameController(textToReplaceToDotNotation);
			this.replaceViewNamesInManifests(textToReplaceFromDotNotation, textToReplaceToDotNotation);
			this.replaceAllOccurancesInFiles(textToReplaceFromDotNotation, textToReplaceToDotNotation);
		}
	}

	private static renameController(newViewName: string) {
		const viewNamePart = newViewName.split(".")[newViewName.split(".").length - 1];
		const viewPath = FileReader.convertClassNameToFSPath(newViewName, false, false, true);
		if (viewPath) {
			const viewText = fs.readFileSync(viewPath, "utf8");
			const controllerName = FileReader.getControllerNameFromView(viewText);
			if (controllerName) {
				const controllerPath = FileReader.convertClassNameToFSPath(controllerName, true);
				if (controllerPath) {
					const newControllerNameParts = controllerName.split(".");
					newControllerNameParts[newControllerNameParts.length - 1] = viewNamePart;
					const newControllerName = newControllerNameParts.join(".");
					const newControllerPath = FileReader.convertClassNameToFSPath(newControllerName, true);
					if (newControllerPath) {
						fs.renameSync(controllerPath, newControllerPath);
						const oldUri = vscode.Uri.file(controllerPath);
						const newUri = vscode.Uri.file(newControllerPath);
						this.replaceCurrentClassNameWithNewOne(oldUri, newUri);
					}
				}
			}
		}
	}

	private static renameViewOfController(newControllerUri: vscode.Uri) {
		const controllerNameDotNotation = FileReader.getClassNameFromPath(newControllerUri.fsPath);
		if (controllerNameDotNotation) {
			const controllerName = controllerNameDotNotation.split(".")[controllerNameDotNotation.split(".").length - 1];
			const viewCache = FileReader.getViewCache();
			const view = Object.keys(viewCache).find(key => FileReader.getControllerNameFromView(viewCache[key].content) === controllerNameDotNotation);
			if (view) {
				let viewNameDotNotation = FileReader.getClassNameFromPath(viewCache[view].fsPath);
				if (viewNameDotNotation) {
					const viewNameDotNotationParts = viewNameDotNotation.split(".");
					viewNameDotNotationParts[viewNameDotNotationParts.length - 1] = controllerName;
					viewNameDotNotation = viewNameDotNotationParts.join(".");

					const newViewPath = FileReader.convertClassNameToFSPath(viewNameDotNotation, false, false, true);
					if (newViewPath) {
						try {
							fs.renameSync(viewCache[view].fsPath, newViewPath);
							const oldUri = vscode.Uri.file(viewCache[view].fsPath);
							const newUri = vscode.Uri.file(newViewPath);
							this.replaceViewNames(oldUri, newUri);
						} catch (error) {
							console.log(`No ${newViewPath} found`);
						}
					}
				}
			}
		}
	}

	private static replaceViewNamesInManifests(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string) {
		const manifests = FileReader.getAllManifests();

		manifests.forEach(manifest => {
			const viewPath = manifest.content["sap.ui5"]?.routing?.config?.viewPath;

			if (viewPath && textToReplaceFromDotNotation.startsWith(viewPath)) {
				const oldPath = `"${textToReplaceFromDotNotation.replace(viewPath, "").replace(".", "")}"`/*removes first dot*/;
				const newPath = `"${textToReplaceToDotNotation.replace(viewPath, "").replace(".", "")}"`/*removes first dot*/;

				if (JSON.stringify(manifest.content).indexOf(oldPath) > -1) {
					const fsPath = `${manifest.fsPath}${fileSeparator}manifest.json`;
					let manifestText = fs.readFileSync(fsPath, "utf8");
					manifestText = manifestText.replace(new RegExp(`${escapeRegExp(oldPath)}`, "g"), newPath);
					fs.writeFileSync(fsPath, manifestText);
				}
			}
		});

		FileReader.rereadAllManifests();
	}

	private static replaceAllOccurancesInFiles(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string) {
		const textToReplaceFromSlashNotation = textToReplaceFromDotNotation.replace(/\./g, "/");
		const textToReplaceToSlashNotation = textToReplaceToDotNotation.replace(/\./g, "/");

		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const src = vscode.workspace.getConfiguration("ui5.plugin").get("src");

		for (const wsFolder of wsFolders) {
			const workspaceFilePaths = glob.sync(wsFolder.uri.fsPath.replace(/\\/g, "/") + "/" + src + "/**/*{.js,.xml,.json}");
			workspaceFilePaths.forEach(filePath => {
				let file = fs.readFileSync(filePath, "utf8");
				if (file.indexOf(textToReplaceFromDotNotation) > -1 || file.indexOf(textToReplaceFromSlashNotation) > -1) {
					file = file.replace(new RegExp('\\"' + textToReplaceFromDotNotation.replace(/\./g, "\\.") + '\\"', "g"), '"' + textToReplaceToDotNotation + '"');
					file = file.replace(new RegExp('\\"' + textToReplaceFromSlashNotation.replace(/\./g, "\\.") + '\\"', "g"), '"' + textToReplaceToSlashNotation + '"');
					//TODO: Think how to do it async. Sync currently needed for folder rename, where mass file change is fired and
					//there might be multiple changes for the same file
					fs.writeFileSync(filePath, file);

					//TODO: Use observer pattern here
					if (filePath.endsWith(".js")) {
						const classNameOfTheReplacedFile = FileReader.getClassNameFromPath(filePath.replace(/\//g, fileSeparator));
						if (classNameOfTheReplacedFile) {
							UIClassFactory.setNewCodeForClass(classNameOfTheReplacedFile, file);
						}
					} else if (filePath.endsWith(".view.xml")) {
						FileReader.setNewViewContentToCache(file, filePath);
					}
				}
			});
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