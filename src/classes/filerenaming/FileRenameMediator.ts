import * as vscode from "vscode";
import {JSFileRenameHandler} from "./handlers/JSFileRenameHandler";
import {XMLFileRenameHandler} from "./handlers/XMLFileRenameHandler";
import {ControllerRenameHandler} from "./handlers/ControllerRenameHandler";
export class FileRenameMediator {
	static handleFileRename(file: {
		oldUri: vscode.Uri;
		newUri: vscode.Uri;
	}) {
		if (file.newUri.fsPath.endsWith(".js")) {
			const jsFileRenameHandler = new JSFileRenameHandler();
			jsFileRenameHandler.handleFileRename(file.oldUri, file.newUri);
		}

		if (file.newUri.fsPath.endsWith(".xml")) {
			const xmlFileRenameHandler = new XMLFileRenameHandler();
			xmlFileRenameHandler.handleFileRename(file.oldUri, file.newUri);
		}

		if (file.newUri.fsPath.endsWith(".controller.js")) {
			const controllerFileRenameHandler = new ControllerRenameHandler();
			controllerFileRenameHandler.handleFileRename(file.oldUri, file.newUri);
		}
	}
}