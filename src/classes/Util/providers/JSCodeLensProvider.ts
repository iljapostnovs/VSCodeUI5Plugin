import * as vscode from "vscode";
import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class JSCodeLensProvider {
	static getCodeLenses(document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];

		const currentClass = SyntaxAnalyzer.getCurrentClassName();
		if (currentClass) {
			const UIClass = UIClassFactory.getUIClass(currentClass);

		}
		return codeLenses;
	}
}