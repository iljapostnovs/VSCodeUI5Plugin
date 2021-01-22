import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";

export class SwitchToControllerCommand {
	static async switchToController() {
		try {
			const controllerNameOfCurrentlyOpenedView = SwitchToControllerCommand.getControllerNameOfCurrentView();
			if (controllerNameOfCurrentlyOpenedView) {
				const controllerFSPath = FileReader.convertClassNameToFSPath(controllerNameOfCurrentlyOpenedView, true);
				const editor = vscode.window.activeTextEditor;
				if (editor && controllerFSPath) {
					await vscode.window.showTextDocument(vscode.Uri.file(controllerFSPath));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	public static getControllerNameOfCurrentView() {
		const document = vscode.window.activeTextEditor?.document;
		const currentViewController = document && FileReader.getResponsibleClassForXMLDocument(document);

		return currentViewController;
	}
}