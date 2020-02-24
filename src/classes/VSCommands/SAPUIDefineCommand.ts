import * as vscode from "vscode";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import { CustomUIClass } from "../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";
import { JSFunctionCall } from "../CustomLibMetadata/JSParser/types/FunctionCall";
import { JSFunction } from "../CustomLibMetadata/JSParser/types/Function";
import { JSString } from "../CustomLibMetadata/JSParser/types/String";

export class SAPUIDefineCommand {
	static insertUIDefine() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const currentClassName = SyntaxAnalyzer.getCurrentClassName();

			if (currentClassName) {
				UIClassFactory.setNewCodeForClass(currentClassName, document.getText());
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				if (UIClass.jsPasredBody) {
					const SAPUIDefine = <JSFunctionCall>(UIClass.jsPasredBody);
					const SAPUIDefineCallbackFn = <JSFunction>(SAPUIDefine.parts[1]);
					if (SAPUIDefineCallbackFn && SAPUIDefine.parts.length > 0) {
						let insertIndexStart: number | undefined;
						let deleteIndexStart:  number | undefined;
						let deleteIndexEnd:  number | undefined;
						let tabAddition = "";
						let newLineAddition = "";

						if (SAPUIDefineCallbackFn.params.length === 0) {
							const EMPTY_PARAMS = "()";
							insertIndexStart = SAPUIDefineCallbackFn.positionBegin + SAPUIDefineCallbackFn.getFullBody().indexOf(EMPTY_PARAMS) + 1;
							tabAddition = "\n\t";
							newLineAddition = "\n";
						} else {
							deleteIndexStart = SAPUIDefineCallbackFn.params[0].positionBegin;
							deleteIndexEnd = SAPUIDefineCallbackFn.params[SAPUIDefineCallbackFn.params.length - 1].positionEnd;
							insertIndexStart = deleteIndexStart;
						}

						const UIDefineParamsText = tabAddition + SAPUIDefine.parts[0].parts.reduce((accumulator: string[], part) => {
							if (part instanceof JSString) {
								const classNameParts = part.parsedBody.substring(1, part.parsedBody.length - 1).split("/");
								const className = classNameParts[classNameParts.length - 1];
								accumulator.push(className);
							}
							return accumulator;
						}, []).join(",\n\t") + newLineAddition;

						editor.edit(editBuilder => {
							if (editor) {
								if (deleteIndexStart && deleteIndexEnd) {
									editBuilder.delete(new vscode.Range(document.positionAt(deleteIndexStart), document.positionAt(deleteIndexEnd)));
								}
								if (insertIndexStart) {
									editBuilder.insert(document.positionAt(insertIndexStart), UIDefineParamsText);
								}
							}
						});
					}
				}
			}
		}
	}
}