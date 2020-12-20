import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../utils/FileReader";
const workspace = vscode.workspace;

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentControllerName: string | null = SwitchToViewCommand._getControllerName();
			const allViewFSPaths: string[] = await SwitchToViewCommand._getAllViewFSPaths();

			const viewToSwitchFSPath = allViewFSPaths.find(viewPath => {
				const view: string = SwitchToViewCommand._getViewFileContent(viewPath);
				const controllerNameOfTheView = SwitchToViewCommand._getControllerNameOfTheView(view);
				return controllerNameOfTheView === currentControllerName;
			});

			const editor = vscode.window.activeTextEditor;
			if (editor && viewToSwitchFSPath) {
				await vscode.window.showTextDocument(vscode.Uri.file(viewToSwitchFSPath));
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async _getAllViewFSPaths() {
		const allViews = await this._findAllViews();
		return allViews.map(view => view.fsPath);
	}

	private static async _findAllViews() {
		const sSrcFolderName = FileReader.getSrcFolderName();
		return workspace.findFiles(`${sSrcFolderName}/**/*.view.xml`);
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