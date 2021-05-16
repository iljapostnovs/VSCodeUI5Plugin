import { FileRenameHandler } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { FileReader } from "../../utils/FileReader";

export class JSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri);

		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, "js");

		//TODO: Use observer pattern here
		const oldClassName = FileReader.getClassNameFromPath(oldUri.fsPath);
		const newClassName = FileReader.getClassNameFromPath(newUri.fsPath);
		if (oldClassName && newClassName) {
			UIClassFactory.setNewNameForClass(oldClassName, newClassName);
		}
	}
}