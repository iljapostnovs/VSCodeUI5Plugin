import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { Util } from "../../../../../utils/Util";
export class UnusedNamespaceLinter extends Linter {
	getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		const documentText = document.getText();

		const aPrefixes = documentText.match(/(?<=xmlns:).*?(?==)/g);
		aPrefixes?.forEach(prefix => {
			const aPrefixes = new RegExp(`(<|\\s)${prefix.trim()}:`, "g").exec(documentText);
			if (!aPrefixes || aPrefixes.length === 0) {
				const positionBegin = documentText.indexOf(`xmlns:${prefix}=`);
				const positionEnd = positionBegin + "xmlns:".length + prefix.length;
				const range = Util.positionsToVSCodeRange(documentText, positionBegin, positionEnd);
				if (range) {
					errors.push({
						code: "UI5plugin",
						message: "Unused namespace",
						source: "Unused namespace linter",
						tags: [vscode.DiagnosticTag.Unnecessary],
						range: range
					});
				}
			}
		});

		return errors;
	}
}