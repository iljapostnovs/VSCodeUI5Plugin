import { FileData, FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
export interface IFileRenameData {
	oldFSPath: string;
	newFSPath: string;
}

export interface IFileChanges {
	fileData: FileData,
	changed: boolean;
	renames: IFileRenameData[]
}

export abstract class FileRenameHandler {
	abstract handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[];

	protected replaceCurrentClassNameWithNewOne(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const oldClassNameDotNotation = FileReader.getClassNameFromPath(oldUri.fsPath);

		if (oldClassNameDotNotation) {
			const newClassNameDotNotation = FileReader.getClassNameFromPath(newUri.fsPath);
			if (newClassNameDotNotation) {
				if (oldClassNameDotNotation !== newClassNameDotNotation) {
					this.replaceAllOccurrencesInFiles(oldClassNameDotNotation, newClassNameDotNotation, allFiles);
				}
			}
		}
	}

	protected replaceAllOccurrencesInFiles(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string, allFiles: IFileChanges[]) {
		const textToReplaceFromSlashNotation = textToReplaceFromDotNotation.replace(/\./g, "/");
		const textToReplaceToSlashNotation = textToReplaceToDotNotation.replace(/\./g, "/");

		allFiles.forEach(file => {
			if (file.fileData.content.includes(textToReplaceFromDotNotation) || file.fileData.content.includes(textToReplaceFromSlashNotation)) {
				file.fileData.content = file.fileData.content.replace(new RegExp("\\\"" + textToReplaceFromDotNotation.replace(/\./g, "\\.") + "\\\"", "g"), "\"" + textToReplaceToDotNotation + "\"");
				file.fileData.content = file.fileData.content.replace(new RegExp("\\{" + textToReplaceFromDotNotation.replace(/\./g, "\\.") + "\\}", "g"), "{" + textToReplaceToDotNotation + "}");
				file.fileData.content = file.fileData.content.replace(new RegExp("\\\"" + textToReplaceFromSlashNotation.replace(/\//g, "\\/") + "\\\"", "g"), "\"" + textToReplaceToSlashNotation + "\"");
				file.changed = true;
			}
		});
	}

}