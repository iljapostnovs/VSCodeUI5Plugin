import * as vscode from "vscode";
import { FileReader } from "./FileReader";
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
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const documentText: string = document.getText();
			const thisDocumentIsEmpty = documentText.length === 0;

			if (thisDocumentIsEmpty) {
				editor.edit(editBuilder => {
					if (editor) {
						editBuilder.insert(document.positionAt(0), this.generateTextToInsertIntoFile(uri));
					}
				});
			}
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
}