import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";

export class ControllerRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this._renameViewOfController(oldUri, newUri, allFiles);
		return allFiles;
	}

	private _renameViewOfController(oldCntrollerUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const controllerNameDotNotation = FileReader.getClassNameFromPath(oldCntrollerUri.fsPath);
		const newControllerNameDotNotation = FileReader.getClassNameFromPath(newUri.fsPath);
		if (controllerNameDotNotation && newControllerNameDotNotation) {
			const controllerName = newControllerNameDotNotation.split(".")[newControllerNameDotNotation.split(".").length - 1];
			const viewFile = allFiles.find(file => FileReader.getControllerNameFromView(file.fileData.content) === newControllerNameDotNotation);
			if (viewFile) {
				const oldViewNameDotNotation = FileReader.getClassNameFromPath(viewFile.fileData.fsPath);
				if (oldViewNameDotNotation) {
					const viewNameDotNotationParts = oldViewNameDotNotation.split(".");
					viewNameDotNotationParts[viewNameDotNotationParts.length - 1] = controllerName;
					const newViewNameDotNotation = viewNameDotNotationParts.join(".");

					const newViewPath = FileReader.convertClassNameToFSPath(newViewNameDotNotation, false, false, true);
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