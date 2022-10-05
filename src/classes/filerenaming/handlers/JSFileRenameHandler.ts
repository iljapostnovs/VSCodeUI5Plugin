import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";

export class JSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri, allFiles);
		this._replaceNamespace(oldUri, newUri, allFiles);

		const isTS = oldUri.fsPath.endsWith(".ts");
		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, isTS ? "ts" : "js");

		UI5Plugin.getInstance().parser.classFactory.setNewNameForClass(oldUri.fsPath, newUri.fsPath);

		return allFiles;
	}

	protected _replaceNamespace(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		const oldOrNewFile = allFiles.find(file => file.fileData.fsPath === oldUri.fsPath || file.fileData.fsPath === newUri.fsPath);
		const oldClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(oldUri.fsPath);
		const newClassNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(newUri.fsPath);

		if (!oldOrNewFile || !oldClassNameDotNotation || !newClassNameDotNotation) {
			return allFiles;
		}
		const oldNamespaceParts = oldClassNameDotNotation.split(".");
		oldNamespaceParts.pop();
		const oldNamespace = oldNamespaceParts.join(".");
		const newNamespaceParts = newClassNameDotNotation.split(".");
		newNamespaceParts.pop();
		const newNamespace = newNamespaceParts.join(".");

		oldOrNewFile.changed = true;
		oldOrNewFile.fileData.content = oldOrNewFile.fileData.content.replace(`@namespace ${oldNamespace}`, `@namespace ${newNamespace}`);

		return allFiles;
	}
}
