import { FileReader } from "../../../utils/FileReader";
import * as vscode from "vscode";
import * as glob from "glob";
import * as fs from "fs";
import * as path from "path";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
const fileSeparator = path.sep;

export abstract class FileRenameHandler {
	abstract handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri): void;

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
		// const src = FileReader.getSrcFolderName();

		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath;
			const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`
			});
			const workspaceFilePaths = glob.sync(wsFolderFSPath.replace(/\\/g, "/") + "/**/*{.js,.xml,.json}", {
				ignore: exclusionPaths
			});
			workspaceFilePaths.forEach(filePath => {
				let fileContent = fs.readFileSync(filePath, "utf8");
				if (fileContent.indexOf(textToReplaceFromDotNotation) > -1 || fileContent.indexOf(textToReplaceFromSlashNotation) > -1) {
					fileContent = fileContent.replace(new RegExp("\\\"" + textToReplaceFromDotNotation.replace(/\./g, "\\.") + "\\\"", "g"), "\"" + textToReplaceToDotNotation + "\"");
					fileContent = fileContent.replace(new RegExp("\\\"" + textToReplaceFromSlashNotation.replace(/\./g, "\\.") + "\\\"", "g"), "\"" + textToReplaceToSlashNotation + "\"");
					//TODO: Think how to do it async. Sync currently needed for folder rename, where mass file change is fired and
					//there might be multiple changes for the same file
					fs.writeFileSync(filePath, fileContent);

					//TODO: Use observer pattern here
					if (filePath.endsWith(".js")) {
						const classNameOfTheReplacedFile = FileReader.getClassNameFromPath(filePath.replace(/\//g, fileSeparator));
						if (classNameOfTheReplacedFile) {
							UIClassFactory.setNewCodeForClass(classNameOfTheReplacedFile, fileContent);
						}
					} else if (filePath.endsWith(".view.xml")) {
						FileReader.setNewViewContentToCache(fileContent, filePath, true);
					}
				}
			});
		}
	}

}