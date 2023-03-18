import * as fs from "fs";
import * as vscode from "vscode";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";
import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class XMLFileRenameHandler extends FileRenameHandler {
	handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		if (newUri.fsPath.endsWith(".view.xml")) {
			this._replaceViewNames(oldUri, newUri, allFiles);
		} else if (newUri.fsPath.endsWith(".fragment.xml")) {
			this._replaceFragmentNames(oldUri, newUri, allFiles);
		}

		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, "xml");
		// const newFile = allFiles.find(file => file.fileData.fsPath === newUri.fsPath);
		// if (newFile) {
		// 	newFile.changed = true;
		// }
		const oldName = this._parser.fileReader.getClassNameFromPath(oldUri.fsPath);
		const newName = this._parser.fileReader.getClassNameFromPath(newUri.fsPath);
		if (oldName && newName) {
			if (oldUri.fsPath.endsWith(".fragment.xml")) {
				this._parser.fileReader.replaceFragmentNames(oldName, newName);
			} else if (oldUri.fsPath.endsWith(".view.xml")) {
				this._parser.fileReader.replaceViewNames(oldName, newName);
			}
		}

		return allFiles;
	}

	private _replaceFragmentNames(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const textToReplaceFromDotNotation = this._parser.fileReader
			.getClassNameFromPath(oldUri.fsPath)
			?.replace(".fragment.xml", "");
		const textToReplaceToDotNotation = this._parser.fileReader
			.getClassNameFromPath(newUri.fsPath)
			?.replace(".fragment.xml", "");

		if (textToReplaceFromDotNotation && textToReplaceToDotNotation) {
			this.replaceAllOccurrencesInFiles(textToReplaceFromDotNotation, textToReplaceToDotNotation, allFiles);
		}
	}

	private _replaceViewNames(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const textToReplaceFromDotNotation = this._parser.fileReader
			.getClassNameFromPath(oldUri.fsPath)
			?.replace(".view.xml", "");
		const textToReplaceToDotNotation = this._parser.fileReader
			.getClassNameFromPath(newUri.fsPath)
			?.replace(".view.xml", "");

		if (textToReplaceFromDotNotation && textToReplaceToDotNotation) {
			this._renameController(textToReplaceToDotNotation, allFiles);
			this._replaceViewNamesInManifests(textToReplaceFromDotNotation, textToReplaceToDotNotation, allFiles);
			this.replaceAllOccurrencesInFiles(textToReplaceFromDotNotation, textToReplaceToDotNotation, allFiles);
		}
	}

	private _renameController(newViewName: string, allFiles: IFileChanges[]) {
		const viewNamePart = newViewName.split(".")[newViewName.split(".").length - 1];
		const viewPath = this._parser.fileReader.convertClassNameToFSPath(newViewName, false, false, true);
		if (viewPath) {
			const viewText = fs.readFileSync(viewPath, "utf8");
			const controllerName = this._parser.fileReader.getControllerNameFromView(viewText);
			if (controllerName) {
				const controllerPath = this._parser.fileReader.convertClassNameToFSPath(controllerName, true);
				if (controllerPath) {
					const newControllerNameParts = controllerName.split(".");
					newControllerNameParts[newControllerNameParts.length - 1] = viewNamePart;
					const newControllerName = newControllerNameParts.join(".");
					const newControllerPath = this._parser.fileReader.convertClassNameToFSPath(newControllerName, true);
					if (newControllerPath && controllerPath !== newControllerPath) {
						const controllerFile = allFiles.find(file => file.fileData.fsPath === controllerPath);
						if (controllerFile) {
							controllerFile.renames.push({
								oldFSPath: controllerPath,
								newFSPath: newControllerPath
							});
						}
					}
				}
			}
		}
	}

	private _replaceViewNamesInManifests(
		textToReplaceFromDotNotation: string,
		textToReplaceToDotNotation: string,
		allFiles: IFileChanges[]
	) {
		const manifests = allFiles.filter(file => file.fileData.fsPath.endsWith("manifest.json"));

		manifests.forEach(manifest => {
			try {
				const content = JSON.parse(manifest.fileData.content);
				const viewPath = content["sap.ui5"]?.routing?.config?.viewPath;

				if (viewPath && textToReplaceFromDotNotation.startsWith(viewPath)) {
					const oldPath = `"${textToReplaceFromDotNotation
						.replace(viewPath, "")
						.replace(".", "")}"`; /*removes first dot*/
					const newPath = `"${textToReplaceToDotNotation
						.replace(viewPath, "")
						.replace(".", "")}"`; /*removes first dot*/

					if (JSON.stringify(content).indexOf(oldPath) > -1) {
						manifest.fileData.content = manifest.fileData.content.replace(
							new RegExp(`${escapeRegExp(oldPath)}`, "g"),
							newPath
						);
						manifest.changed = true;
					}
				}
			} catch (error) {
				console.error((<any>error).message);
			}
		});
	}
}
