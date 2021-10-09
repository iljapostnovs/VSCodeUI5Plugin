import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";

export class JSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri, allFiles);

		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, "js");

		UI5Plugin.getInstance().parser.classFactory.setNewNameForClass(oldUri.fsPath, newUri.fsPath);

		return allFiles;
	}
}