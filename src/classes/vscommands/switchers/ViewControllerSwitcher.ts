import { SwitchToControllerCommand } from "./SwitchToControllerCommand";
import { SwitchToViewCommand } from "./SwitchToViewCommand";
import * as vscode from "vscode";
import { SwitchToModelCommand } from "./SwitchToModelCommand";

export class ControllerModelViewSwitcher {
	static async switchBetweenControllerModelView() {

		if (ControllerModelViewSwitcher._getIfViewIsOpened()) {

			await SwitchToControllerCommand.switchToController();
		} else if (ControllerModelViewSwitcher._getIfControllerIsOpened()) {

			try {
				await SwitchToModelCommand.switchToModel();
			} catch(error) {
				await SwitchToViewCommand.switchToView();
			}
		} else if (ControllerModelViewSwitcher._getIfJSClassIsOpened()) {

			await SwitchToViewCommand.switchToView();
		}
	}

	private static _getIfViewIsOpened() {
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		return fileName?.endsWith(".view.xml") || fileName?.endsWith(".fragment.xml") || false;
	}

	private static _getIfControllerIsOpened() {
		return vscode.window.activeTextEditor?.document.fileName.endsWith(".controller.js") || false;
	}

	private static _getIfJSClassIsOpened() {
		return vscode.window.activeTextEditor?.document.fileName.endsWith(".js") || false;
	}
}