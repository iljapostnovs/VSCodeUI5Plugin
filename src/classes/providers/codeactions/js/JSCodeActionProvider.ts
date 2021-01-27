import * as vscode from "vscode";
import {AcornSyntaxAnalyzer} from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import {CustomUIClass} from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import {UIClassFactory} from "../../../UI5Classes/UIClassFactory";
import LineColumn = require("line-column");
import {CustomDiagnostics, CustomDiagnosticType} from "../../../registrators/DiagnosticsRegistrator";
import {MethodInserter} from "../util/MethodInserter";
import {FileReader} from "../../../utils/FileReader";
import {SAPUIDefineFactory} from "../../completionitems/js/sapuidefine/SAPUIDefineFactory";

export class JSCodeActionProvider {
	static async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		let providerResult: vscode.CodeAction[] = this._getCreateMethodCodeActions(document, range);
		providerResult = providerResult.concat(await this._getImportClassCodeActions(document, range));
		return providerResult;
	}

	private static _getCreateMethodCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this._getCurrentVariable(document, range);
		const jsDiagnosticCollection = vscode.languages.getDiagnostics(document.uri);
		const customDiagnostics = <CustomDiagnostics[]>jsDiagnosticCollection.filter(diagnostic => diagnostic instanceof CustomDiagnostics);
		const nonExistendMethodDiagnostics = customDiagnostics.filter(diagnostic => diagnostic.type === CustomDiagnosticType.NonExistentMethod);
		const codeActions: vscode.CodeAction[] = nonExistendMethodDiagnostics.reduce((accumulator: vscode.CodeAction[], diagnostic: CustomDiagnostics) => {
			const className = FileReader.getClassNameFromPath(document.fileName);
			if (className && diagnostic.methodName && diagnostic.attribute && selectedVariableName === diagnostic.methodName) {
				const insertCodeAction = MethodInserter.createInsertMethodCodeAction(diagnostic.attribute, diagnostic.methodName, this._getInsertContentFromIdentifierName(diagnostic.methodName));
				if (insertCodeAction) {
					accumulator.push(insertCodeAction);
				}
			}

			return accumulator;
		}, []);

		return codeActions;
	}

	private static _getInsertContentFromIdentifierName(name: string) {
		let content = "";

		const type = CustomUIClass.getTypeFromHungarianNotation(name)?.toLowerCase();
		switch (type) {
			case "object":
				content = "{}";
				break;
			case "array":
				content = "[]";
				break;
			case "int":
				content = "0";
				break;
			case "float":
				content = "0";
				break;
			case "number":
				content = "0";
				break;
			case "map":
				content = "{}";
				break;
			case "string":
				content = "\"\"";
				break;
			case "boolean":
				content = "true";
				break;
			case "any":
				content = "null";
				break;
			case "function":
				content = "function() {\n\t\t\t\n\t\t}";
				break;
			default:
				content = "function() {\n\t\t\t\n\t\t}";
		}

		return content;
	}

	private static async _getImportClassCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this._getCurrentVariable(document, range);
		let providerResult: vscode.CodeAction[] = [];

		if (selectedVariableName) {
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.uri.fsPath);
			if (currentClassName) {
				UIClassFactory.setNewContentForCurrentUIClass(document);
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const UIDefine = await new SAPUIDefineFactory().generateUIDefineCompletionItems();
				const UIDefineCompletionItemsWhichContainsCurrentSelectionText = UIDefine.filter(completionItem => completionItem.label.indexOf(selectedVariableName) > -1)
					.filter(completionItem => !UIClass.UIDefine.find(UIDefine => `"${UIDefine.path}"` === completionItem.label))
					.reverse();

				UIDefineCompletionItemsWhichContainsCurrentSelectionText.forEach(completionItem => {
					const UIDefineCodeAction = new vscode.CodeAction(`Import ${completionItem.label}`, vscode.CodeActionKind.QuickFix);
					UIDefineCodeAction.isPreferred = true;
					UIDefineCodeAction.edit = new vscode.WorkspaceEdit();
					UIDefineCodeAction.command = {command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define"};
					const position = this._getPositionOfTheLastUIDefine(document);
					if (position) {
						const insertText = UIClass.UIDefine.length === 0 ? `\n\t${completionItem.label}` : `,\n\t${completionItem.label}`;
						UIDefineCodeAction.edit.insert(document.uri, position, insertText);
						providerResult.push(UIDefineCodeAction);
					}
				});
			}
		}

		providerResult = providerResult.sort((a, b) => {
			const firstItemPriority = this._calculatePriority(a);
			const secondItemPriority = this._calculatePriority(b);

			return secondItemPriority - firstItemPriority;
		});

		return providerResult;
	}

	private static _calculatePriority(codeAction: vscode.CodeAction) {
		const priorities = ["sap/ui/model/", "sap/m/", "sap/ui/"];
		let priority = 1;
		priorities.find((priorityString, index) => {
			if (codeAction.title.includes(priorityString)) {
				priority = priorities.length + 1 - index;

				return true;
			}

			return false;
		});

		return priority;
	}

	private static _getCurrentVariable(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		let selectedVariableName = document.getText(range);

		if (!selectedVariableName) {
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.uri.fsPath);
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

	private static _getPositionOfTheLastUIDefine(document: vscode.TextDocument) {
		let position: vscode.Position | undefined;
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument(document.uri.fsPath);
		if (currentClassName) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const mainFunction = UIClass.fileContent?.body[0]?.expression;
			const definePaths: any[] = mainFunction?.arguments[0]?.elements;

			let insertPosition = 0;
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
