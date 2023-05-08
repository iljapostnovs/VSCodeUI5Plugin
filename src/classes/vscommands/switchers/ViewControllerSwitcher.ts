import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";
import { SwitchToControllerCommand } from "./SwitchToControllerCommand";
import { SwitchToModelCommand } from "./SwitchToModelCommand";
import { SwitchToViewCommand } from "./SwitchToViewCommand";

export class ControllerModelViewSwitcher extends ParserBearer {
	async switchBetweenControllerModelView() {
		const switchToControllerCommand = new SwitchToControllerCommand(this._parser);
		const switchToModelCommand = new SwitchToModelCommand(this._parser);
		const switchToViewCommand = new SwitchToViewCommand(this._parser);

		if (this._getIfViewIsOpened()) {
			await switchToControllerCommand.switchToController();
		} else if (this._getIfControllerIsOpened()) {
			try {
				await switchToModelCommand.switchToModel();
			} catch (error) {
				await switchToViewCommand.switchToView();
			}
		} else if (this._getIfJSClassIsOpened()) {
			try {
				await switchToModelCommand.switchToModel();
			} catch (error) {
				await switchToViewCommand.switchToView();
			}
		}
	}

	private _getIfViewIsOpened() {
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		return fileName?.endsWith(".view.xml") || fileName?.endsWith(".fragment.xml") || false;
	}

	private _getIfControllerIsOpened() {
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		return fileName?.endsWith(".controller.js") || fileName?.endsWith(".controller.ts") || false;
	}

	private _getIfJSClassIsOpened() {
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		return fileName?.endsWith(".js") || fileName?.endsWith(".ts") || false;
	}
}
