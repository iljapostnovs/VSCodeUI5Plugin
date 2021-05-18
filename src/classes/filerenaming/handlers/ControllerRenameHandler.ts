import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";
import * as fs from "fs";
import { XMLFileRenameHandler } from "./XMLFileRenameHandler";

export class ControllerRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		// this._renameViewOfController(newUri, allFiles);
		return allFiles;
	}

	private _renameViewOfController(newControllerUri: vscode.Uri, allFiles: IFileChanges[]) {
		const controllerNameDotNotation = FileReader.getClassNameFromPath(newControllerUri.fsPath);
		if (controllerNameDotNotation) {
			const controllerName = controllerNameDotNotation.split(".")[controllerNameDotNotation.split(".").length - 1];
			const viewCache = FileReader.getViewCache();
			const view = Object.keys(viewCache).find(key => FileReader.getControllerNameFromView(viewCache[key].content) === controllerNameDotNotation);
			if (view) {
				let viewNameDotNotation = FileReader.getClassNameFromPath(viewCache[view].fsPath);
				if (viewNameDotNotation) {
					const viewNameDotNotationParts = viewNameDotNotation.split(".");
					viewNameDotNotationParts[viewNameDotNotationParts.length - 1] = controllerName;
					viewNameDotNotation = viewNameDotNotationParts.join(".");

					const newViewPath = FileReader.convertClassNameToFSPath(viewNameDotNotation, false, false, true);
					if (newViewPath) {
						try {
							fs.renameSync(viewCache[view].fsPath, newViewPath);
							const oldUri = vscode.Uri.file(viewCache[view].fsPath);
							const newUri = vscode.Uri.file(newViewPath);

							const viewRenameHandler = new XMLFileRenameHandler();
							viewRenameHandler.handleFileRename(oldUri, newUri, allFiles);
						} catch (error) {
							console.log(`No ${newViewPath} found`);
						}
					}
				}
			}
		}
	}
}