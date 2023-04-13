import path = require("path");
import * as fs from "fs";
import { ParserPool } from "ui5plugin-parser";
import { FileData } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import * as vscode from "vscode";
import ParserBearer from "../ui5parser/ParserBearer";

export class VSCodeFileReader extends ParserBearer {
	getComponentNameOfAppInCurrentWorkspaceFolder() {
		return this.getCurrentWorkspaceFoldersManifest()?.componentName;
	}

	getCurrentWorkspaceFoldersManifest() {
		const currentClassName = this.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			return ParserPool.getManifestForClass(currentClassName);
		}
	}

	getClassNameOfTheCurrentDocument(classPath?: string) {
		let returnClassName;

		if (!classPath) {
			classPath = vscode.window.activeTextEditor?.document.uri.fsPath;
		}

		if (classPath) {
			returnClassName = this._parser.fileReader.getClassNameFromPath(classPath);
		}

		return returnClassName;
	}

	getControllerNameOfTheCurrentDocument() {
		let controllerName;
		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && currentDocument.fileName.endsWith(".view.xml")) {
			const currentDocumentText = currentDocument.getText();
			controllerName = this._parser.fileReader.getControllerNameFromView(currentDocumentText);
		}

		return controllerName;
	}

	static getAllFilesInAllWorkspaces() {
		const files: FileData[] = [];

		const allFilePaths = ParserPool.getAllFileReaders().flatMap(fileReader =>
			fileReader.readFiles("/**/*{.ts,.js,.xml,.json}")
		);

		allFilePaths.forEach(filePath => {
			const fsPath = path.normalize(filePath);
			const file = fs.readFileSync(fsPath, "utf-8");
			if (file) {
				files.push({
					fsPath,
					content: file
				});
			}
		});

		return files;
	}
}
