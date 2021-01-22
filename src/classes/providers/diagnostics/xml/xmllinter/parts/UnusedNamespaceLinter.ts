import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
export class UnusedNamespaceLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];

		const documentText = document.getText();

		const aPrefixes = documentText.match(/(?<=xmlns:).*?(?==)/g);
		aPrefixes?.forEach(prefix => {
			const aPrefixes = new RegExp(`(<|\\s)${prefix.trim()}:`, "g").exec(documentText);
			if (!aPrefixes || aPrefixes.length === 0) {
				const positionBegin = documentText.indexOf(`xmlns:${prefix}=`);
				const position = LineColumn(documentText).fromIndex(positionBegin - 1);
				if (position) {
					errors.push({
						code: "UI5plugin",
						message: "Unused namespace",
						source: prefix,
						tags: [vscode.DiagnosticTag.Unnecessary],
						range: new vscode.Range(
							new vscode.Position(position.line - 1, position.col),
							new vscode.Position(position.line - 1, position.col + "xmlns:".length + prefix.length)
						)
					});
				}
			}
		});

		return errors;
	}
}