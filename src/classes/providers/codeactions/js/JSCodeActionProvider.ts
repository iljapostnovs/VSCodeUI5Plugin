import { UI5JSParser } from "ui5plugin-parser";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import { CustomDiagnostics, CustomDiagnosticType } from "../../../registrators/DiagnosticsRegistrator";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { SAPUIDefineFactory } from "../../completionitems/factories/js/sapuidefine/SAPUIDefineFactory";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { InsertType, MethodInserter } from "../util/MethodInserter";

export class JSCodeActionProvider extends ParserBearer<UI5JSParser> {
	async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		let providerResult: vscode.CodeAction[] = this._getCreateMethodCodeActions(document, range);
		providerResult = providerResult.concat(await this._getImportClassCodeActions(document, range));
		return providerResult;
	}

	private _getCreateMethodCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this._getCurrentVariable(document, range);
		const jsDiagnosticCollection = vscode.languages.getDiagnostics(document.uri);
		const customDiagnostics = <CustomDiagnostics[]>(
			jsDiagnosticCollection.filter(diagnostic => diagnostic instanceof CustomDiagnostics)
		);
		const nonExistendMethodDiagnostics = customDiagnostics.filter(
			diagnostic => diagnostic.type === CustomDiagnosticType.NonExistentMethod
		);
		const codeActions: vscode.CodeAction[] = nonExistendMethodDiagnostics.reduce(
			(accumulator: vscode.CodeAction[], diagnostic: CustomDiagnostics) => {
				const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
				if (
					className &&
					diagnostic.methodName &&
					diagnostic.attribute &&
					selectedVariableName === diagnostic.methodName
				) {
					let parameters = "";
					const callExpression: any | undefined = diagnostic.acornNode?.expandedContent?.find(
						(content: any) =>
							content.start === diagnostic.acornNode.start && content.type === "CallExpression"
					);
					if (callExpression?.arguments?.length > 0) {
						parameters = callExpression.arguments
							.map((arg: any, index: number) => (arg.type === "Identifier" ? arg.name : `arg${index}`))
							.join(", ");
					}

					const insertCodeAction = new MethodInserter(this._parser).createInsertMethodCodeAction(
						diagnostic.attribute,
						diagnostic.methodName,
						parameters,
						"",
						this._getInsertTypeFromIdentifierName(diagnostic.methodName)
					);
					if (insertCodeAction && !accumulator.find(accum => accum.title === insertCodeAction.title)) {
						accumulator.push(insertCodeAction);
					}
				}

				return accumulator;
			},
			[]
		);

		return codeActions;
	}

	private _getInsertTypeFromIdentifierName(name: string) {
		const type = CustomJSClass.getTypeFromHungarianNotation(name)?.toLowerCase();
		if (type === "function" || !type) {
			return InsertType.Method;
		} else {
			return InsertType.Field;
		}
	}

	private async _getImportClassCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const selectedVariableName = this._getCurrentVariable(document, range);
		let providerResult: vscode.CodeAction[] = [];
		const positionFits = this._getIfPositionIsNewExpressionOrExpressionStatement(document, range.start);

		if (positionFits && selectedVariableName) {
			const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (currentClassName) {
				this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
				const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(currentClassName);
				const UIDefine = await this._parser.getCustomData<SAPUIDefineFactory>("SAPUIDefineFactory")?.generateUIDefineCompletionItems() ?? [];
				const UIDefineCompletionItemsWhichContainsCurrentSelectionText = UIDefine.filter(
					completionItem => (completionItem.label as string).indexOf(selectedVariableName) > -1
				)
					.filter(
						completionItem =>
							!UIClass.UIDefine.find(UIDefine => `"${UIDefine.path}"` === completionItem.label)
					)
					.reverse();

				UIDefineCompletionItemsWhichContainsCurrentSelectionText.forEach(completionItem => {
					const UIDefineCodeAction = new vscode.CodeAction(
						`Import ${completionItem.label}`,
						vscode.CodeActionKind.QuickFix
					);
					UIDefineCodeAction.isPreferred = true;
					UIDefineCodeAction.edit = new vscode.WorkspaceEdit();
					UIDefineCodeAction.command = {
						command: "ui5plugin.moveDefineToFunctionParameters",
						title: "Add to UI Define"
					};
					const position = new ReusableMethods(this._parser).getPositionOfTheLastUIDefine(document);
					if (position) {
						const insertText =
							UIClass.UIDefine.length === 0
								? `\n\t${completionItem.label}`
								: `,\n\t${completionItem.label}`;
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
	private _getIfPositionIsNewExpressionOrExpressionStatement(
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let currentPositionIsNewExpressionOrExpressionStatement = false;

		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const offset = document.offsetAt(position);
			const currentUIClass = <CustomJSClass>this._parser.classFactory.getUIClass(currentClassName);
			const currentMethod = currentUIClass.methods.find(method => {
				return method.node?.start < offset && offset < method.node?.end;
			});
			if (currentMethod) {
				const allContent = this._parser.syntaxAnalyser.expandAllContent(currentMethod.node);
				const newExpressionOrExpressionStatement = allContent.find((node: any) => {
					const firstChar: undefined | string = node.name?.[0];
					const firstCharCaps = firstChar?.toUpperCase();
					return (
						node.type === "Identifier" &&
						firstChar &&
						firstChar === firstCharCaps &&
						node.start <= offset &&
						node.end >= offset
					);
				});

				currentPositionIsNewExpressionOrExpressionStatement = !!newExpressionOrExpressionStatement;
			}
		}

		return currentPositionIsNewExpressionOrExpressionStatement;
	}

	private _calculatePriority(codeAction: vscode.CodeAction) {
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

	private _getCurrentVariable(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		let selectedVariableName = document.getText(range);

		if (!selectedVariableName) {
			const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
			if (UIClass instanceof CustomJSClass) {
				const currentPositionOffset = document?.offsetAt(range.end);
				const node = this._parser.syntaxAnalyser.findAcornNode(
					UIClass.acornMethodsAndFields,
					currentPositionOffset
				);
				if (node && node.value) {
					const content = this._parser.syntaxAnalyser
						.expandAllContent(node.value)
						.filter(node => node.type === "Identifier");
					const neededIdentifier = this._parser.syntaxAnalyser.findAcornNode(content, currentPositionOffset);
					if (neededIdentifier) {
						selectedVariableName = neededIdentifier.name;
					}
				}
			}
		}

		return selectedVariableName;
	}
}
