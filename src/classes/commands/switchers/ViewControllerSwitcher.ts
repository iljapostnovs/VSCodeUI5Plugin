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
		return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName.indexOf(".view.xml") > -1 : false;
	}

	static getIfControllerIsOpened() {
		return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName.indexOf(".controller.js") > -1 : false;
	}
}