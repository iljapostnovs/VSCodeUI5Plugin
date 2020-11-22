import * as vscode from "vscode";

export class FallbackCommand {
	static notifyUserThatThisIsNotUI5Project() {
		vscode.window.showInformationMessage("Current project is not recognized as UI5 Project");
	}
}