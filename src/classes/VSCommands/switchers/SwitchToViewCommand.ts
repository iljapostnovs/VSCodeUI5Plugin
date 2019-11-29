import * as vscode from "vscode"
import * as fs from "fs";
let workspace = vscode.workspace;

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			let currentControllerName: string | null = SwitchToViewCommand.getControllerName();
			let viewToSwitch: string = "";
			let allViewFSPaths: string[] = await SwitchToViewCommand.getAllViewFSPaths();

			for (const viewFSPath of allViewFSPaths) {
				let view: string = SwitchToViewCommand.getViewFileContent(viewFSPath);
				let controllerNameOfTheView = SwitchToViewCommand.getControllerNameOfTheView(view);
				let thisViewShouldBeSwitched = controllerNameOfTheView === currentControllerName;
				if (thisViewShouldBeSwitched) {
					viewToSwitch = viewFSPath;
					break;
				}
			}

			let editor = vscode.window.activeTextEditor;
			if (editor && !!viewToSwitch) {
				await vscode.window.showTextDocument(vscode.Uri.file(viewToSwitch));
			}

		} catch (error) {
			console.log(error);
		}
	}

	private static async getAllViewFSPaths() {
		let allViews = await this.findAllViews();
		return allViews.map(view => view.fsPath);
	}

	private static async findAllViews() {
		return workspace.findFiles("**/*.view.xml");
	}

	private static getControllerName() {
		let currentController = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		let result = /(?<=.extend\(").*(?=")/.exec(currentController);
		return result && result[0] ? result[0] : null;
	}

	private static getViewFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "ascii");
	}

	private static getControllerNameOfTheView(view: string) {
		let result = /(?<=controllerName=").*(?=")/.exec(view) || [];
		return result[0] ? result[0] : null;
	}
}