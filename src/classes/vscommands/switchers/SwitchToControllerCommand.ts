import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";

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
		const controlFSPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(controllerName);
		const editor = vscode.window.activeTextEditor;
		if (editor && controlFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(controlFSPath));
		}
	}

	public static getResponsibleClassForCurrentView() {
		const document = vscode.window.activeTextEditor?.document;
		const currentViewController = document && UI5Plugin.getInstance().parser.fileReader.getResponsibleClassForXMLDocument(new TextDocumentAdapter(document));

		return currentViewController;
	}
}