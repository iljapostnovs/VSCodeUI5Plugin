import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import * as glob from "glob";
import * as fs from "fs";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { WorkspaceCompletionItemFactory } from "../CompletionItems/WorkspaceCompletionItemFactory";

var workspace = vscode.workspace;

export class FileWatcher {
	static register() {
		workspace.onDidSaveTextDocument(document => {
			if (document.fileName.endsWith(".js")) {

				const currentClassNameDotNotation = SyntaxAnalyzer.getCurrentClass(document.getText());
				if (currentClassNameDotNotation) {
					UIClassFactory.setNewCodeForClass(currentClassNameDotNotation, document.getText());
				}
			} else if (document.fileName.endsWith(".view.xml")) {

				let viewContent = document.getText();
				viewContent = FileReader.replaceFragments(viewContent);
				FileReader.setNewViewContentToCache(viewContent);
			}
		});

		workspace.onDidCreateFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					this.handleJSFileCreate(file);
				}
			})
		})

		workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				if (file.newUri.fsPath.endsWith(".js")) {
					this.replaceCurrentClassNameWithNewOne(file.oldUri, file.newUri);
				}

				if (file.newUri.fsPath.indexOf(".") === -1) {
					this.handleFolderRename(file.oldUri, file.newUri);
				}
			})
		})
	}

	public static syncrhoniseJSDefineCompletionItems(completionItems: vscode.CompletionItem[]) {
		workspace.onDidCreateFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseCreate(completionItems, file);
				}
			})
		})

		workspace.onDidDeleteFiles(event => {
			event.files.forEach(file => {
				if (file.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseDelete(completionItems, file);
				}
			})
		})

		workspace.onDidRenameFiles(event => {
			event.files.forEach(file => {
				if (file.newUri.fsPath.endsWith(".js")) {
					WorkspaceCompletionItemFactory.synchroniseCreate(completionItems, file.newUri);
					WorkspaceCompletionItemFactory.synchroniseDelete(completionItems, file.oldUri);
				}
			})
		})
	}

	private static handleJSFileCreate(uri: vscode.Uri) {
		const changedFileText = fs.readFileSync(uri.fsPath, "ascii");

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

		return `sap.ui.define([\r\n\t\"${standardUIDefineClassForExtension}\"\r\n], function (\r\n\t${controlName}\r\n) {\r\n\t\"use strict\";\r\n\r\n\treturn ${controlName}.extend(\"${classNameDotNotation}\", {\r\n\t});\r\n});`
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

	private static replaceAllOccurancesInFiles(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string) {
		const textToReplaceFromSlashNotation = textToReplaceFromDotNotation.replace(/\./g, "/");
		const textToReplaceToSlashNotation = textToReplaceToDotNotation.replace(/\./g, "/");

		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const src = vscode.workspace.getConfiguration("ui5.plugin").get("src");

		for (const wsFolder of wsFolders) {
			const workspaceFilePaths = glob.sync(wsFolder.uri.fsPath.replace(/\\/g, "/") + "/" + src + "/**/*{.js,.xml,.json}");
			workspaceFilePaths.forEach(jsFilePath => {
				let file = fs.readFileSync(jsFilePath, "ascii");
				if (file.indexOf(textToReplaceFromDotNotation) > -1 || file.indexOf(textToReplaceFromSlashNotation) > -1) {
					file = file.replace(new RegExp('\\"' + textToReplaceFromDotNotation.replace(/\./g, "\\.") + '\\"', "g"), '"' + textToReplaceToDotNotation + '"');
					file = file.replace(new RegExp('\\"' + textToReplaceFromSlashNotation.replace(/\./g, "\\.") + '\\"', "g"), '"' + textToReplaceToSlashNotation + '"');
					//TODO: Think how to do it async. Sync currently needed for folder rename, where mass file change is fired and
					//there might be multiple changes for the same file
					fs.writeFileSync(jsFilePath, file);

					//TODO: Use observer pattern here
					if (jsFilePath.endsWith(".js")) {
						const classNameOfTheReplacedFile = FileReader.getClassNameFromPath(jsFilePath.replace(/\//g, "\\"))
						if (classNameOfTheReplacedFile) {
							UIClassFactory.setNewCodeForClass(classNameOfTheReplacedFile, file);
						}
					} else if (jsFilePath.endsWith(".view.xml")) {
						FileReader.setNewViewContentToCache(file);
					}
				}
			});
		}
	}

	private static handleFolderRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const newFilePaths = glob.sync(newUri.fsPath.replace(/\//g, "\\") + "/**/*{.js,.xml}");
		newFilePaths.forEach(filePath => {
			const newFileUri = vscode.Uri.file(filePath);
			const oldFileUri = vscode.Uri.file(filePath.replace(newUri.fsPath.replace(/\\/g, "/"), oldUri.fsPath.replace(/\\/g, "/")));
			this.replaceCurrentClassNameWithNewOne(oldFileUri, newFileUri);
		});
	}
}