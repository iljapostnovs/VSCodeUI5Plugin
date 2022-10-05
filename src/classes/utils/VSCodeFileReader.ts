import glob = require("glob");
import path = require("path");
import { UI5Parser } from "ui5plugin-parser";
import { FileData } from "ui5plugin-parser/dist/classes/utils/FileReader";
import * as vscode from "vscode";
import * as fs from "fs";
const escapedFileSeparator = "\\" + path.sep;

export class VSCodeFileReader {
	static getComponentNameOfAppInCurrentWorkspaceFolder() {
		return this.getCurrentWorkspaceFoldersManifest()?.componentName;
	}

	static getCurrentWorkspaceFoldersManifest() {
		const currentClassName = this.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			return UI5Parser.getInstance().fileReader.getManifestForClass(currentClassName);
		}
	}
	public static getClassNameOfTheCurrentDocument(classPath?: string) {
		let returnClassName;

		if (!classPath) {
			classPath = vscode.window.activeTextEditor?.document.uri.fsPath;
		}

		if (classPath) {
			returnClassName = UI5Parser.getInstance().fileReader.getClassNameFromPath(classPath);
		}

		return returnClassName;
	}

	static getControllerNameOfTheCurrentDocument() {
		let controllerName;
		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && currentDocument.fileName.endsWith(".view.xml")) {
			const currentDocumentText = currentDocument.getText();
			controllerName = UI5Parser.getInstance().fileReader.getControllerNameFromView(currentDocumentText);
		}

		return controllerName;
	}


	static getAllFilesInAllWorkspaces() {
		const workspace = vscode.workspace;
		const wsFolders = workspace.workspaceFolders || [];
		const files: FileData[] = [];

		for (const wsFolder of wsFolders) {
			const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
			const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
			const exclusionPaths = exclusions.map(excludeString => {
				return `${wsFolderFSPath}/${excludeString}`
			});
			const workspaceFilePaths = glob.sync(wsFolderFSPath + "/**/*{.ts,.js,.xml,.json}", {
				ignore: exclusionPaths
			});
			workspaceFilePaths.forEach(filePath => {
				const fsPath = path.normalize(filePath);
				const file = fs.readFileSync(fsPath, "utf-8");
				if (file) {
					files.push({
						fsPath,
						content: file
					});
				}
			});
		}

		return files;
	}
}