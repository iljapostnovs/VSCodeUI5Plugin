import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../utils/FileReader";
const workspace = vscode.workspace;

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentControllerName: string | null = SwitchToViewCommand._getControllerName();
			let viewToSwitch: string = "";
			const allViewFSPaths: string[] = await SwitchToViewCommand._getAllViewFSPaths();

			for (const viewFSPath of allViewFSPaths) {
				const view: string = SwitchToViewCommand._getViewFileContent(viewFSPath);
				const controllerNameOfTheView = SwitchToViewCommand._getControllerNameOfTheView(view);
				const thisViewShouldBeSwitched = controllerNameOfTheView === currentControllerName;
				if (thisViewShouldBeSwitched) {
					viewToSwitch = viewFSPath;
					break;
				}
			}

			const editor = vscode.window.activeTextEditor;
			if (editor && !!viewToSwitch) {
				await vscode.window.showTextDocument(vscode.Uri.file(viewToSwitch));
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
		const currentController = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		const result = /(?<=.extend\(").*?(?=")/.exec(currentController);
		return result && result[0] ? result[0] : null;
	}

	private static _getViewFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "utf8");
	}

	private static _getControllerNameOfTheView(view: string) {
		return FileReader.getControllerNameFromView(view);
	}
}