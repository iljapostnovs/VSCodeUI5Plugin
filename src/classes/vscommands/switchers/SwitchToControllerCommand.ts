import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";

export class SwitchToControllerCommand {
	static async switchToController() {
		try {
			const document = vscode.window.activeTextEditor?.document;
			if (document) {

				const isViewOrFragment = document?.fileName.endsWith(".view.xml") || document?.fileName.endsWith(".fragment.xml");
				if (isViewOrFragment) {
					const controllerNameOfCurrentlyOpenedView = SwitchToControllerCommand.getResponsibleClassForCurrentView();
					if (controllerNameOfCurrentlyOpenedView) {
						await this._switchToController(controllerNameOfCurrentlyOpenedView);
					}
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	private static async _switchToController(controllerName: string) {
		const controlFSPath = FileReader.getClassPathFromClassName(controllerName);
		const editor = vscode.window.activeTextEditor;
		if (editor && controlFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(controlFSPath));
		}
	}

	public static getResponsibleClassForCurrentView() {
		const document = vscode.window.activeTextEditor?.document;
		const currentViewController = document && FileReader.getResponsibleClassForXMLDocument(document);

		return currentViewController;
	}
}