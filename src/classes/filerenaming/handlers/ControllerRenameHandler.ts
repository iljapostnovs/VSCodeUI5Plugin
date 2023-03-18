import * as vscode from "vscode";
import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";

export class ControllerRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this._renameViewOfController(oldUri, newUri, allFiles);
		return allFiles;
	}

	private _renameViewOfController(oldControllerUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const controllerNameDotNotation = this._parser.fileReader.getClassNameFromPath(oldControllerUri.fsPath);
		const newControllerNameDotNotation = this._parser.fileReader.getClassNameFromPath(newUri.fsPath);
		if (controllerNameDotNotation && newControllerNameDotNotation) {
			const controllerName =
				newControllerNameDotNotation.split(".")[newControllerNameDotNotation.split(".").length - 1];
			const viewFile = allFiles.find(
				file =>
					this._parser.fileReader.getControllerNameFromView(file.fileData.content) ===
					newControllerNameDotNotation
			);
			if (viewFile) {
				const oldViewNameDotNotation = this._parser.fileReader.getClassNameFromPath(viewFile.fileData.fsPath);
				if (oldViewNameDotNotation) {
					const viewNameDotNotationParts = oldViewNameDotNotation.split(".");
					viewNameDotNotationParts[viewNameDotNotationParts.length - 1] = controllerName;
					const newViewNameDotNotation = viewNameDotNotationParts.join(".");

					const newViewPath = this._parser.fileReader.convertClassNameToFSPath(
						newViewNameDotNotation,
						false,
						false,
						true
					);
					if (newViewPath && viewFile.fileData.fsPath !== newViewPath) {
						if (viewFile) {
							viewFile.renames.push({
								oldFSPath: viewFile.fileData.fsPath,
								newFSPath: newViewPath
							});
						}
					}
				}
			}
		}
	}
}
