import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import * as glob from "glob";
import * as fs from "fs";

export class FileWatcher {
	static register() {
		let folders = vscode.workspace.workspaceFolders;
		if (folders) {
			folders.forEach(folder => {
				let watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, "**/*.js"));
				watcher.onDidCreate(uri => {
					this.handleFileCreate(uri);
				});
			});
		}
	}

	private static handleFileCreate(uri: vscode.Uri) {
		const changedFileText = fs.readFileSync(uri.fsPath, "ascii");

		const thisFileIsEmpty = changedFileText.length === 0;

		if (thisFileIsEmpty) {
			this.insertCodeTemplate(uri);
		} else {
			this.replaceCurrentClassNameWithNewOne(uri, changedFileText);
		}
	}

	private static insertCodeTemplate(uri: vscode.Uri) {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			editor.edit(editBuilder => {
				if (editor) {
					editBuilder.insert(document.positionAt(0), this.generateTextToInsertIntoFile(uri));
				}
			});
		}
	}

	private static generateTextToInsertIntoFile(uri: vscode.Uri) {
		const isController = uri.fsPath.endsWith(".controller.js");
		const classNameDotNotation = FileReader.getClassNameFromPath(uri.fsPath);

		const standardUIDefineClassForExtension = isController ? "sap/ui/core/mvc/Controller" : "sap/ui/base/ManagedObject";
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];

		return `sap.ui.define([\r\n\t\"${standardUIDefineClassForExtension}\"\r\n], function (\r\n\t${controlName}\r\n) {\r\n\t\"use strict\";\r\n\r\n\treturn ${controlName}.extend(\"${classNameDotNotation}\", {\r\n\t});\r\n});`
	}

	private static replaceCurrentClassNameWithNewOne(uri: vscode.Uri, changedFileText: string) {
		const currentClassNameDotNotation = SyntaxAnalyzer.gerCurrentClass(changedFileText);

		if (currentClassNameDotNotation) {
			const currentClassNameSlashNotation = currentClassNameDotNotation.replace(/\./g, "/");
			const newClassNameDotNotation = FileReader.getClassNameFromPath(uri.fsPath);
			if (newClassNameDotNotation) {
				const newClassNameSlashNotation = newClassNameDotNotation.replace(/\./g, "/");
				if (currentClassNameDotNotation !== newClassNameDotNotation) {
					this.replaceAllOccurances(currentClassNameDotNotation, newClassNameDotNotation);
					this.replaceAllOccurances(currentClassNameSlashNotation, newClassNameSlashNotation);
				}
			}
		}
	}

	private static replaceAllOccurances(textToReplaceFrom: string, textToReplaceTo: string) {
		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const src = vscode.workspace.getConfiguration("ui5.plugin").get("src");

		for (const wsFolder of wsFolders) {
			const jsFilePaths = glob.sync(wsFolder.uri.fsPath.replace(/\\/g, "/") + "/" + src + "/**/*{.js,.xml}");
			jsFilePaths.forEach(jsFilePath => {
				let file = fs.readFileSync(jsFilePath, "ascii");
				if (file.indexOf(textToReplaceFrom) > -1) {
					file = file.replace(new RegExp(textToReplaceFrom, "g"), textToReplaceTo);
					fs.writeFile(jsFilePath, file, () => {});
				}
			});
		}

	}
}