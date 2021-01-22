import * as vscode from "vscode";
import { FileReader } from "../../utils/FileReader";

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentControllerName = SwitchToViewCommand._getControllerName();

			if (currentControllerName) {
				const view = FileReader.getViewForController(currentControllerName);
				if (!view) {
					const fragment = FileReader.getFragmentForClass(currentControllerName);
					if (fragment) {
						await vscode.window.showTextDocument(vscode.Uri.file(fragment.fsPath));
					}
				} else {
					await vscode.window.showTextDocument(vscode.Uri.file(view.fsPath));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static _getControllerName() {
		let controllerName: string | undefined;
		const document = vscode.window.activeTextEditor?.document;
		if (document) {
			controllerName = FileReader.getClassNameFromPath(document.fileName);
		}
		return controllerName;
	}
}