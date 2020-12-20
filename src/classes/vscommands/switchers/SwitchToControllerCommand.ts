import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../utils/FileReader";
const workspace = vscode.workspace;

export class SwitchToControllerCommand {
	static async switchToController() {
		try {
			const controllerNameOfCurrentlyOpenedView = SwitchToControllerCommand.getControllerNameOfCurrentView();
			if (controllerNameOfCurrentlyOpenedView) {
				const allControllerFSPaths: string[] = await SwitchToControllerCommand._getAllControllerFSPaths();
				const controllerToSwitch = allControllerFSPaths.find(controllerFSPath => {
					const controller = SwitchToControllerCommand._getControllerFileContent(controllerFSPath);
					const controllerName = SwitchToControllerCommand._getControllerName(controller);
					return controllerName === controllerNameOfCurrentlyOpenedView;
				});

				const editor = vscode.window.activeTextEditor;
				if (editor && !!controllerToSwitch) {
					await vscode.window.showTextDocument(vscode.Uri.file(controllerToSwitch));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async _getAllControllerFSPaths() {
		const allControllers = await this._findAllControllers();
		return allControllers.map(controller => controller.fsPath);
	}

	private static async _findAllControllers() {
		const sSrcFolderName = FileReader.getSrcFolderName();
		return workspace.findFiles(`${sSrcFolderName}/**/*.controller.js`);
	}

	public static getControllerNameOfCurrentView() {
		const currentViewContent = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		const result = /(?<=controllerName=").*?(?=")/.exec(currentViewContent) || [];
		return result[0] ? result[0] : null;
	}

	private static _getControllerFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "utf8");
	}

	private static _getControllerName(controllerName: string) {
		const result = /(?<=.extend\(").*?(?=")/.exec(controllerName);

		return result && result[0] ? result[0] : null;
	}
}