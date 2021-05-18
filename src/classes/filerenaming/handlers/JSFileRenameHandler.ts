import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";

export class JSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri, allFiles);

		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, "js");

		UIClassFactory.setNewNameForClass(oldUri.fsPath, newUri.fsPath);
		// const className = FileReader.getClassNameFromPath(oldUri.fsPath);
		// if (className) {
		// UIClassFactory.removeClass(className);
		// }
		// const newFile = allFiles.find(file => file.fileData.fsPath === newUri.fsPath);
		// if (newFile) {
		// 	newFile.changed = true;
		// }

		return allFiles;
	}
}