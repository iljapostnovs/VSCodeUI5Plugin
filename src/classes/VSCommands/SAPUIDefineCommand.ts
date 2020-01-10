import * as vscode from "vscode";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import { CustomUIClass } from "../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";
import { JSFunctionCall } from "../CustomLibMetadata/JSParser/types/FunctionCall";
import { JSFunction } from "../CustomLibMetadata/JSParser/types/Function";
export class SAPUIDefineCommand {
	static insertUIDefine() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const currentClassName = SyntaxAnalyzer.getCurrentClass();

			if (currentClassName) {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				if (UIClass.jsPasredBody) {
					const SAPUIDefine = <JSFunctionCall>(UIClass.jsPasredBody);
					const SAPUIDefineCallbackFn = <JSFunction>(SAPUIDefine.parts[1]);
					if (SAPUIDefineCallbackFn) {
						// SAPUIDefineCallbackFn.params
					}
					debugger;
				}
			}
			// editor.edit(editBuilder => {
			// 	if (editor) {
			// 		editBuilder.delete(new vscode.Range(document.positionAt(deleteIndexStart), document.positionAt(deleteIndexEnd)));
			// 		editBuilder.insert(document.positionAt(insertIndexStart), insertText);
			// 	}
			// });
		}
	}
}