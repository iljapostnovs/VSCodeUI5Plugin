import { FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
import * as glob from "glob";
import * as fs from "fs";
import * as path from "path";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
const fileSeparator = path.sep;


export abstract class FileRenameHandler {
	abstract handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri) : void;

	protected replaceCurrentClassNameWithNewOne(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const oldClassNameDotNotation = FileReader.getClassNameFromPath(oldUri.fsPath);

		if (oldClassNameDotNotation) {
			const newClassNameDotNotation = FileReader.getClassNameFromPath(newUri.fsPath);
			if (newClassNameDotNotation) {
				if (oldClassNameDotNotation !== newClassNameDotNotation) {
					this.replaceAllOccurrencesInFiles(oldClassNameDotNotation, newClassNameDotNotation);
				}
			}
		}
	}

	protected replaceAllOccurrencesInFiles(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string) {
		const textToReplaceFromSlashNotation = textToReplaceFromDotNotation.replace(/\./g, "/");
		const textToReplaceToSlashNotation = textToReplaceToDotNotation.replace(/\./g, "/");

		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const src = FileReader.getSrcFolderName();

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

}