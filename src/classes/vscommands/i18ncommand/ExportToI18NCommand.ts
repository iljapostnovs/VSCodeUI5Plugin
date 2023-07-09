import * as vscode from "vscode";
import ExportBase from "./ExportBase";

export class ExportToI18NCommand extends ExportBase {
	public async export() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error("Please select string for export");
		}

		await super.export(editor.document);
	}
}
