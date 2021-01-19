import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../utils/FileReader";
const workspace = vscode.workspace;

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentControllerName = SwitchToViewCommand._getControllerName();

			if (currentControllerName) {
				const view = FileReader.getView(currentControllerName);

				const editor = vscode.window.activeTextEditor;
				if (editor && view) {
					await vscode.window.showTextDocument(vscode.Uri.file(view.fsPath));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static _getControllerName() {
		let controllerName: string | null = null;
		const currentController = vscode.window.activeTextEditor?.document.getText();
		if (currentController) {
			const result = /(?<=.extend\(").*?(?=")/.exec(currentController);
			controllerName = result && result[0] ? result[0] : null;
		}
		return controllerName;
	}

	private static _getViewFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "utf8");
	}

	private static _getControllerNameOfTheView(view: string) {
		return FileReader.getControllerNameFromView(view);
	}
}