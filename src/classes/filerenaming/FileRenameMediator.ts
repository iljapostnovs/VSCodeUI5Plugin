import * as vscode from "vscode";
import { JSFileRenameHandler } from "./handlers/JSFileRenameHandler";
import { XMLFileRenameHandler } from "./handlers/XMLFileRenameHandler";
import { ControllerRenameHandler } from "./handlers/ControllerRenameHandler";
import { IFileChanges } from "./handlers/abstraction/FileRenameHandler";
export class FileRenameMediator {
	static handleFileRename(uri: {
		oldUri: vscode.Uri;
		newUri: vscode.Uri;
	}, allFiles: IFileChanges[]): IFileChanges[] {

		if (uri.newUri.fsPath.endsWith(".js")) {
			const jsFileRenameHandler = new JSFileRenameHandler();
			jsFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		if (uri.newUri.fsPath.endsWith(".xml")) {
			const xmlFileRenameHandler = new XMLFileRenameHandler();
			xmlFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		if (uri.newUri.fsPath.endsWith(".controller.js")) {
			const controllerFileRenameHandler = new ControllerRenameHandler();
			controllerFileRenameHandler.handleFileRename(uri.oldUri, uri.newUri, allFiles);
		}

		return allFiles;
	}
}