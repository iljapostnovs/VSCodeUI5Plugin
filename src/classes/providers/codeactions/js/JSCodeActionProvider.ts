import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomDiagnostics, CustomDiagnosticType } from "../../../registrators/DiagnosticsRegistrator";
import { InsertType, MethodInserter } from "../util/MethodInserter";
import { FileReader } from "../../../utils/FileReader";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { SAPUIDefineFactory } from "../../completionitems/factories/js/sapuidefine/SAPUIDefineFactory";
import { TextDocumentTransformer } from "../../../utils/TextDocumentTransformer";

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
				const insertCodeAction = MethodInserter.createInsertMethodCodeAction(diagnostic.attribute, diagnostic.methodName, "", "", this._getInsertTypeFromIdentifierName(diagnostic.methodName));
				if (insertCodeAction && !accumulator.find(accum => accum.title === insertCodeAction.title)) {
					accumulator.push(insertCodeAction);
				}
			}

			return accumulator;
		}, []);

		return codeActions;
	}

	private static _getInsertTypeFromIdentifierName(name: string) {
		const type = CustomUIClass.getTypeFromHungarianNotation(name)?.toLowerCase();
		if (type === "function" || !type) {
			return InsertType.Method;
		} else {
			return InsertType.Field;
		}
	}

	private static async _getImportClassCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this._getCurrentVariable(document, range);
		let providerResult: vscode.CodeAction[] = [];
		const positionFits = this._getIfPositionIsNewExpressionOrExpressionStatement(document, range.start);

		if (positionFits && selectedVariableName) {
			const currentClassName = FileReader.getClassNameFromPath(document.fileName);
			if (currentClassName) {
				UIClassFactory.setNewContentForClassUsingDocument(document);
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const UIDefine = await new SAPUIDefineFactory().generateUIDefineCompletionItems();
				const UIDefineCompletionItemsWhichContainsCurrentSelectionText = UIDefine
					.filter(completionItem => (completionItem.label as string).indexOf(selectedVariableName) > -1)
					.filter(completionItem => !UIClass.UIDefine.find(UIDefine => `"${UIDefine.path}"` === completionItem.label))
					.reverse();

				UIDefineCompletionItemsWhichContainsCurrentSelectionText.forEach(completionItem => {
					const UIDefineCodeAction = new vscode.CodeAction(`Import ${completionItem.label}`, vscode.CodeActionKind.QuickFix);
					UIDefineCodeAction.isPreferred = true;
					UIDefineCodeAction.edit = new vscode.WorkspaceEdit();
					UIDefineCodeAction.command = { command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define" };
					const position = ReusableMethods.getPositionOfTheLastUIDefine(document);
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
	//TODO: reuse with Class completion items
	private static _getIfPositionIsNewExpressionOrExpressionStatement(document: vscode.TextDocument, position: vscode.Position) {
		let currentPositionIsNewExpressionOrExpressionStatement = false;

		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const offset = document.offsetAt(position);
			const currentUIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const currentMethod = currentUIClass.methods.find(method => {
				return method.acornNode?.start < offset && offset < method.acornNode?.end;
			});
			if (currentMethod) {
				const allContent = AcornSyntaxAnalyzer.expandAllContent(currentMethod.acornNode);
				const newExpressionOrExpressionStatement = allContent.find((node: any) => {
					return (
						node.type === "NewExpression" ||
						(
							node.type === "ExpressionStatement" &&
							node.expression?.type === "Identifier"
						)
					) &&
						node.start <= offset && node.end >= offset;
				});

				currentPositionIsNewExpressionOrExpressionStatement = !!newExpressionOrExpressionStatement;
			}
		}


		return currentPositionIsNewExpressionOrExpressionStatement;
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
			const UIClass = TextDocumentTransformer.toCustomUIClass(document);
			if (UIClass) {
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
}
