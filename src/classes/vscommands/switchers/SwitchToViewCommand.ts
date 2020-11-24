import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../utils/FileReader";
const workspace = vscode.workspace;

export class SwitchToViewCommand {
	static async switchToView() {
		try {
			const currentControllerName: string | null = SwitchToViewCommand.getControllerName();
			let viewToSwitch: string = "";
			const allViewFSPaths: string[] = await SwitchToViewCommand.getAllViewFSPaths();

			for (const viewFSPath of allViewFSPaths) {
				const view: string = SwitchToViewCommand.getViewFileContent(viewFSPath);
				const controllerNameOfTheView = SwitchToViewCommand.getControllerNameOfTheView(view);
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

	private static async getAllViewFSPaths() {
		const allViews = await this.findAllViews();
		return allViews.map(view => view.fsPath);
	}

	private static async findAllViews() {
		const sSrcFolderName = FileReader.getSrcFolderName();
		return workspace.findFiles(`${sSrcFolderName}/**/*.view.xml`);
	}

	private static getControllerName() {
		const currentController = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText() : "";
		const result = /(?<=.extend\(").*?(?=")/.exec(currentController);
		return result && result[0] ? result[0] : null;
	}

	private static getViewFileContent(controllerFSPath: string) {
		return fs.readFileSync(controllerFSPath, "utf8");
	}

	private static getControllerNameOfTheView(view: string) {
		return FileReader.getControllerNameFromView(view);
	}
}