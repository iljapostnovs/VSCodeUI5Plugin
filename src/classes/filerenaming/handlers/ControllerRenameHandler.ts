import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";

export class ControllerRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this._renameViewOfController(oldUri, newUri, allFiles);
		return allFiles;
	}

	private _renameViewOfController(oldCntrollerUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const controllerNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(oldCntrollerUri.fsPath);
		const newControllerNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(newUri.fsPath);
		if (controllerNameDotNotation && newControllerNameDotNotation) {
			const controllerName = newControllerNameDotNotation.split(".")[newControllerNameDotNotation.split(".").length - 1];
			const viewFile = allFiles.find(file => UI5Plugin.getInstance().parser.fileReader.getControllerNameFromView(file.fileData.content) === newControllerNameDotNotation);
			if (viewFile) {
				const oldViewNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(viewFile.fileData.fsPath);
				if (oldViewNameDotNotation) {
					const viewNameDotNotationParts = oldViewNameDotNotation.split(".");
					viewNameDotNotationParts[viewNameDotNotationParts.length - 1] = controllerName;
					const newViewNameDotNotation = viewNameDotNotationParts.join(".");

					const newViewPath = UI5Plugin.getInstance().parser.fileReader.convertClassNameToFSPath(newViewNameDotNotation, false, false, true);
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