import * as glob from "glob";
import * as path from "path";
import { toNative } from "ui5plugin-parser";
import * as vscode from "vscode";
import ParserBearer from "../ui5parser/ParserBearer";
import { ControllerRenameHandler } from "./handlers/ControllerRenameHandler";
import { JSTSFileRenameHandler } from "./handlers/JSTSFileRenameHandler";
import { XMLFileRenameHandler } from "./handlers/XMLFileRenameHandler";
import { IFileChanges } from "./handlers/abstraction/FileRenameHandler";
const fileSeparator = path.sep;
export class FileRenameMediator extends ParserBearer {
	handleFileRename(
		uri: {
			oldUri: vscode.Uri;
			newUri: vscode.Uri;
		},
		allFiles: IFileChanges[]
	): IFileChanges[] {
		if (uri.newUri.fsPath.endsWith(".js") || uri.newUri.fsPath.endsWith(".ts")) {
			const jsFileRenameHandler = new JSTSFileRenameHandler(this._parser);
			jsFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		if (uri.newUri.fsPath.endsWith(".xml")) {
			const xmlFileRenameHandler = new XMLFileRenameHandler(this._parser);
			xmlFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		if (uri.newUri.fsPath.endsWith(".controller.js") || uri.newUri.fsPath.endsWith(".controller.ts")) {
			const controllerFileRenameHandler = new ControllerRenameHandler(this._parser);
			controllerFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		return allFiles;
	}

	handleFolderRename(oldUri: vscode.Uri, newUri: vscode.Uri, fileChanges: IFileChanges[]): IFileChanges[] {
		const newUriFsPath = toNative(newUri.fsPath);
		const oldUriFsPath = toNative(oldUri.fsPath);
		const newFilePaths = glob
			.sync(newUriFsPath.replace(/\\/g, "/") + "/**/*{.js,.ts,.xml}")
			.map(fsPath => toNative(fsPath));
		newFilePaths.forEach(filePath => {
			const newFileUri = vscode.Uri.file(filePath);
			const oldFileUri = vscode.Uri.file(
				filePath
					.replace(/\//g, fileSeparator)
					.replace(newUriFsPath.replace(/\//g, fileSeparator), oldUriFsPath.replace(/\//g, fileSeparator))
			);

			this.handleFileRename(
				{
					newUri: newFileUri,
					oldUri: oldFileUri
				},
				fileChanges
			);
		});
		// const FileReader = require("../utils/FileReader").FileReader;
		// const changesEdited = (<any>fileChanges).filter((change: any) => change.changed).map((change: any) => { change.fileData.fsPath = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(change.fileData.fsPath); return change; })
		// copy(JSON.stringify(changesEdited))

		return fileChanges;
	}
}
