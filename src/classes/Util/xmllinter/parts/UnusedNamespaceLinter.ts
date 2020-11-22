import { Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
export class UnusedNamespaceLinter extends Linter {
	getErrors(document: string): Error[] {
		const errors: Error[] = [];

		const aPrefixes = document.match(/(?<=xmlns:).*?(?==)/g);
		aPrefixes?.forEach(prefix => {
			const aPrefixes = new RegExp(`(<|\\s)${prefix}:`, "g").exec(document);
			if (!aPrefixes || aPrefixes.length === 0) {
				const positionBegin = document.indexOf(`xmlns:${prefix}=`);
				const position = LineColumn(document).fromIndex(positionBegin - 1);
				if (position) {
					errors.push({
						code: "UI5plugin",
						message: "Unused namespace",
						source: prefix,
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