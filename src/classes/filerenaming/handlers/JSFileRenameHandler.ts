import { FileRenameHandler } from "./abstraction/FileRenameHandler";
import * as vscode from "vscode";

export class JSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri) {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri);
	}
}