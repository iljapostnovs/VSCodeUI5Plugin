import * as vscode from "vscode";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { PascalCaseStrategy } from "./i18ncommand/strategies/PascalCaseStrategy";
export class SAPUIDefineCommand {
	static insertUIDefine() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();

			if (currentClassName) {
				UIClassFactory.setNewContentForClassUsingDocument(document);
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
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