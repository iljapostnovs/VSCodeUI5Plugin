import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";
import { FileRenameHandler } from "./abstraction/FileRenameHandler";
import * as fs from "fs";
import * as path from "path";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";
const fileSeparator = path.sep;
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class XMLFileRenameHandler extends FileRenameHandler {
	handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
		if (newUri.fsPath.endsWith(".view.xml")) {
			this._replaceViewNames(oldUri, newUri);
		}

		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, "xml");
	}


	private _replaceViewNames(oldUri: vscode.Uri, newUri: vscode.Uri) {
		const textToReplaceFromDotNotation = FileReader.getClassNameFromPath(oldUri.fsPath)?.replace(".view.xml", "");
		const textToReplaceToDotNotation = FileReader.getClassNameFromPath(newUri.fsPath)?.replace(".view.xml", "");

		if (textToReplaceFromDotNotation && textToReplaceToDotNotation) {
			this._renameController(textToReplaceToDotNotation);
			this._replaceViewNamesInManifests(textToReplaceFromDotNotation, textToReplaceToDotNotation);
			this.replaceAllOccurrencesInFiles(textToReplaceFromDotNotation, textToReplaceToDotNotation);
		}
	}

	private _renameController(newViewName: string) {
		const viewNamePart = newViewName.split(".")[newViewName.split(".").length - 1];
		const viewPath = FileReader.convertClassNameToFSPath(newViewName, false, false, true);
		if (viewPath) {
			const viewText = fs.readFileSync(viewPath, "utf8");
			const controllerName = FileReader.getControllerNameFromView(viewText);
			if (controllerName) {
				const controllerPath = FileReader.convertClassNameToFSPath(controllerName, true);
				if (controllerPath) {
					const newControllerNameParts = controllerName.split(".");
					newControllerNameParts[newControllerNameParts.length - 1] = viewNamePart;
					const newControllerName = newControllerNameParts.join(".");
					const newControllerPath = FileReader.convertClassNameToFSPath(newControllerName, true);
					if (newControllerPath) {
						fs.renameSync(controllerPath, newControllerPath);
						const oldUri = vscode.Uri.file(controllerPath);
						const newUri = vscode.Uri.file(newControllerPath);
						this.replaceCurrentClassNameWithNewOne(oldUri, newUri);
					}
				}
			}
		}
	}

	private _replaceViewNamesInManifests(textToReplaceFromDotNotation: string, textToReplaceToDotNotation: string) {
		const manifests = FileReader.getAllManifests();

		manifests.forEach(manifest => {
			const viewPath = manifest.content["sap.ui5"]?.routing?.config?.viewPath;

			if (viewPath && textToReplaceFromDotNotation.startsWith(viewPath)) {
				const oldPath = `"${textToReplaceFromDotNotation.replace(viewPath, "").replace(".", "")}"`/*removes first dot*/;
				const newPath = `"${textToReplaceToDotNotation.replace(viewPath, "").replace(".", "")}"`/*removes first dot*/;

				if (JSON.stringify(manifest.content).indexOf(oldPath) > -1) {
					const fsPath = `${manifest.fsPath}${fileSeparator}manifest.json`;
					let manifestText = fs.readFileSync(fsPath, "utf8");
					manifestText = manifestText.replace(new RegExp(`${escapeRegExp(oldPath)}`, "g"), newPath);
					fs.writeFileSync(fsPath, manifestText);
				}
			}
		});

		FileReader.rereadAllManifests();
	}
}