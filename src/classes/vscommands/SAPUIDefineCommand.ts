import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { VSCodeFileReader } from "../utils/VSCodeFileReader";
import { PascalCaseStrategy } from "./i18ncommand/strategies/PascalCaseStrategy";
export class SAPUIDefineCommand {
	static insertUIDefine() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const currentClassName = VSCodeFileReader.getClassNameOfTheCurrentDocument();

			if (currentClassName) {
				UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
				const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(currentClassName);
				if (UIClass.fileContent) {
					const mainFunction = UIClass.fileContent?.body[0]?.expression;
					const definePaths: string[] = mainFunction?.arguments[0]?.elements?.map((element: any) => element.value);
					const defineParams: any[] = mainFunction?.arguments[1]?.params;

					if (definePaths && definePaths.length > 0) {

						let deleteIndexStart: any;
						let deleteIndexEnd: any;
						let insertIndexStart: any;
						let spaceAtTheBegining = "";

						if (defineParams.length === 0) {
							insertIndexStart = SAPUIDefineCommand.getIndexOfParenthesesBegin(mainFunction?.arguments[1].start);
							spaceAtTheBegining = "\n\t";
						} else {
							deleteIndexStart = defineParams[0].start;
							deleteIndexEnd = defineParams[defineParams.length - 1].end;
							insertIndexStart = deleteIndexStart;
						}

						const newDefineParams = definePaths.map(definePath => {
							const pathParts = definePath.split("/");
							let className = pathParts[pathParts.length - 1];

							if (className.indexOf(".") > -1) {
								const pascalCaseStrategy = new PascalCaseStrategy();
								className = pascalCaseStrategy.transform(className.replace(".", " "));
							}

							return className;
						});

						const defineStringToInsert = spaceAtTheBegining + newDefineParams.join(",\n\t");

						editor.edit(editBuilder => {
							if (editor) {
								if (deleteIndexStart && deleteIndexEnd) {
									editBuilder.delete(new vscode.Range(document.positionAt(deleteIndexStart), document.positionAt(deleteIndexEnd)));
								}
								if (insertIndexStart) {
									editBuilder.insert(document.positionAt(insertIndexStart), defineStringToInsert);
								}
							}
						});
					}
				}
			}
		}
	}

	public static getIndexOfParenthesesBegin(indexOfTheFunctionBegin: number) {
		let index = 0;
		const documentText = vscode.window.activeTextEditor?.document.getText();
		if (documentText) {
			const text = documentText.substring(indexOfTheFunctionBegin, documentText.length);

			let i = 0;

			while (text[i] !== "(") {
				i++;
			}

			index = i;
		}

		return indexOfTheFunctionBegin + index + 1;
	}
}