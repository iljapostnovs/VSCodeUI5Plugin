import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../ui5parser/ParserBearer";

export class SwitchToControllerCommand extends ParserBearer {
	async switchToController() {
		try {
			const document = vscode.window.activeTextEditor?.document;
			if (document) {
				const isViewOrFragment =
					document?.fileName.endsWith(".view.xml") || document?.fileName.endsWith(".fragment.xml");
				if (isViewOrFragment) {
					const controllerNameOfCurrentlyOpenedView = this.getResponsibleClassForCurrentView();
					if (controllerNameOfCurrentlyOpenedView) {
						await this._switchToController(controllerNameOfCurrentlyOpenedView);
					}
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	private async _switchToController(controllerName: string) {
		const controlFSPath = this._parser.fileReader.getClassFSPathFromClassName(controllerName);
		const editor = vscode.window.activeTextEditor;
		if (editor && controlFSPath) {
			await vscode.window.showTextDocument(vscode.Uri.file(controlFSPath));
		}
	}

	public getResponsibleClassForCurrentView() {
		const document = vscode.window.activeTextEditor?.document;
		const currentViewController =
			document && this._parser.fileReader.getResponsibleClassForXMLDocument(new TextDocumentAdapter(document));

		return currentViewController;
	}
}
