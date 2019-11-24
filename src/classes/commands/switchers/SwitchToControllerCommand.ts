import * as vscode from "vscode"
import * as fs from "fs";
let workspace = vscode.workspace;

export class SwitchToControllerCommand {
	static async switchToController() {
		try {
			let controllerNameOfCurrentlyOpenedView: string | null = SwitchToControllerCommand.getControllerNameOfCurrentView();
			let controllerToSwitch: string = "";
			if (controllerNameOfCurrentlyOpenedView) {
				let allControllerFSPaths: string[] = await SwitchToControllerCommand.getAllControllerFSPaths();

				for (const controllerFSPath of allControllerFSPaths) {
					let controller = SwitchToControllerCommand.getControllerFileContent(controllerFSPath);
					let controllerName = SwitchToControllerCommand.getControllerName(controller);
					let thisControllerShouldBeSwitched = controllerName === controllerNameOfCurrentlyOpenedView;
					if (thisControllerShouldBeSwitched) {
						controllerToSwitch = controllerFSPath;
						break;
					}
				}


				let editor = vscode.window.activeTextEditor;
				if (editor && !!controllerToSwitch) {
					await vscode.window.showTextDocument(vscode.Uri.file(controllerToSwitch));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async getAllControllerFSPaths() {
		let allControllers = await this.findAllControllers();
		return allControllers.map(controller => controller.fsPath);
	}

	private static async findAllControllers() {
		return workspace.findFiles("**/*.controller.js");
	}

	private static getControllerNameOfCurrentView() {
		let currentViewContent = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		let result = /(?<=controllerName=").*(?=")/.exec(currentViewContent) || [];
		return result[0] ? result[0] : null;
	}

	private static getControllerFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "ascii");
	}

	private static getControllerName(controller: string) {
		let result = /(?<=.extend\(").*(?=")/.exec(controller);

		return result && result[0] ? result[0] : null;
	}
}