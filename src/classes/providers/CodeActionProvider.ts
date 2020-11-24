import * as vscode from "vscode";
import { UIDefineFactory } from "../vscodecompletionitems/completionitemfactories/javascript/UIDefineFactory";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import LineColumn = require("line-column");

export class CodeActionProvider {
	static async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this.getCurrentVariable(document, range);
		const providerResult: vscode.CodeAction[] = [];

		if (selectedVariableName) {
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.getText());
			if (currentClassName) {
				UIClassFactory.setNewContentForCurrentUIClass();
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const UIDefine = await new UIDefineFactory().generateUIDefineCompletionItems();
				const filteredUIDefineCompletionItems = UIDefine.filter(completionItem => completionItem.label.indexOf(selectedVariableName) > -1)
																.filter(completionItem => !UIClass.UIDefine.find(UIDefine => `"${UIDefine.path}"` === completionItem.label))
																.reverse();

				filteredUIDefineCompletionItems.forEach(completionItem => {
					const UIDefineCodeAction = new vscode.CodeAction(`Import ${completionItem.label}`, vscode.CodeActionKind.QuickFix);
					UIDefineCodeAction.isPreferred = true;
					UIDefineCodeAction.edit = new vscode.WorkspaceEdit();
					UIDefineCodeAction.command = {command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define"};
					const position = this.getPositionOfTheLastUIDefine(document);
					if (position) {
						const insertText = UIClass.UIDefine.length === 0 ? `\n\t${completionItem.label}` : `,\n\t${completionItem.label}`;
						UIDefineCodeAction.edit.insert(document.uri, position, insertText);
						providerResult.push(UIDefineCodeAction);
					}
				});
			}
		}

		return providerResult;
	}

	private static getCurrentVariable(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		let selectedVariableName = document.getText(range);

		if (!selectedVariableName) {
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.getText());
			if (currentClassName && vscode.window.activeTextEditor) {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const currentPositionOffset = document?.offsetAt(range.end);
				const node = AcornSyntaxAnalyzer.findAcornNode(UIClass.acornMethodsAndFields, currentPositionOffset);
				if (node && node.value) {
					const content = AcornSyntaxAnalyzer.expandAllContent(node.value).filter(node => node.type === "Identifier");
					const neededIdentifier = AcornSyntaxAnalyzer.findAcornNode(content, currentPositionOffset);
					if (neededIdentifier) {
						selectedVariableName = neededIdentifier.name;
					}
				}
			}
		}


		return selectedVariableName;
	}

	private static getPositionOfTheLastUIDefine(document: vscode.TextDocument) {
		let position: vscode.Position | undefined;
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.getText());
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const mainFunction = UIClass.fileContent?.body[0]?.expression;
			const definePaths: any[] = mainFunction?.arguments[0]?.elements;

			let insertPosition: number = 0;
			if (definePaths?.length) {
				const lastDefinePath = definePaths[definePaths.length - 1];
				insertPosition = lastDefinePath.end;
			} else {
				insertPosition = mainFunction?.arguments[0]?.start;
			}

			const lineColumn = LineColumn(document.getText()).fromIndex(insertPosition);

			if (lineColumn) {
				position = new vscode.Position(lineColumn.line - 1, lineColumn.col);
			}

		}

		return position;
	}

}
