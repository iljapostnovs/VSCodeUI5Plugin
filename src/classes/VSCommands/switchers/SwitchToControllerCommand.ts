import * as vscode from "vscode";
import * as fs from "fs";
const workspace = vscode.workspace;

export class SwitchToControllerCommand {
	static async switchToController() {
		try {
			const controllerNameOfCurrentlyOpenedView: string | null = SwitchToControllerCommand.getControllerNameOfCurrentView();
			let controllerToSwitch: string = "";
			if (controllerNameOfCurrentlyOpenedView) {
				const allControllerFSPaths: string[] = await SwitchToControllerCommand.getAllControllerFSPaths();

				for (const controllerFSPath of allControllerFSPaths) {
					const controller = SwitchToControllerCommand.getControllerFileContent(controllerFSPath);
					const controllerName = SwitchToControllerCommand.getControllerName(controller);
					const thisControllerShouldBeSwitched = controllerName === controllerNameOfCurrentlyOpenedView;
					if (thisControllerShouldBeSwitched) {
						controllerToSwitch = controllerFSPath;
						break;
					}
				}


				const editor = vscode.window.activeTextEditor;
				if (editor && !!controllerToSwitch) {
					await vscode.window.showTextDocument(vscode.Uri.file(controllerToSwitch));
				}
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async getAllControllerFSPaths() {
		const allControllers = await this.findAllControllers();
		return allControllers.map(controller => controller.fsPath);
	}

	private static async findAllControllers() {
		return workspace.findFiles("**/*.controller.js");
	}

	private static getControllerNameOfCurrentView() {
		const currentViewContent = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		const result = /(?<=controllerName=").*?(?=")/.exec(currentViewContent) || [];
		return result[0] ? result[0] : null;
	}

	private static getControllerFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "utf8");
	}

	private static getControllerName(controller: string) {
		const result = /(?<=.extend\(").*(?=")/.exec(controller);

		return result && result[0] ? result[0] : null;
	}
}