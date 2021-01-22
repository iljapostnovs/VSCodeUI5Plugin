import { SwitchToControllerCommand } from "./SwitchToControllerCommand";
import { SwitchToViewCommand } from "./SwitchToViewCommand";
import * as vscode from "vscode";

export class ViewControllerSwitcher {
	static async switchBetweenViewController() {

		if (ViewControllerSwitcher.getIfViewIsOpened()) {
			SwitchToControllerCommand.switchToController();

		} else if (ViewControllerSwitcher.getIfControllerIsOpened()) {
			SwitchToViewCommand.switchToView();
		}
	}

	static getIfViewIsOpened() {
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		return fileName && (fileName.endsWith(".view.xml") || fileName.endsWith(".fragment.xml"));
	}

	static getIfControllerIsOpened() {
		return vscode.window.activeTextEditor?.document.fileName.endsWith(".js") || false;
	}
}