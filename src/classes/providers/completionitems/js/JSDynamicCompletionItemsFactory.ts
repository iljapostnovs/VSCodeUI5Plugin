import * as vscode from "vscode";
import {AcornSyntaxAnalyzer} from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import {FieldsAndMethods} from "../../../UI5Classes/UIClassFactory";
import {CustomCompletionItem} from "../CustomCompletionItem";

export class JSDynamicCompletionItemsFactory {

	public createUIClassCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const fieldsAndMethods = AcornSyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable(document, position);
		if (fieldsAndMethods) {
			completionItems = this._generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods);
		}

		return completionItems;
	}

	private _generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods) {
		const position = vscode.window.activeTextEditor?.selection.start;
		const range = position && vscode.window.activeTextEditor?.document.getWordRangeAtPosition(position);
		const word = range && vscode.window.activeTextEditor?.document.getText(range);

		let completionItems = fieldsAndMethods.methods.map(classMethod => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(classMethod.name);
			completionItem.kind = vscode.CompletionItemKind.Method;

			let insertString = `${classMethod.name}`;
			if (!word) {
				const mandatoryParams = classMethod.params.filter(param => !param.name.endsWith("?"));
				const paramString = mandatoryParams.map((param, index) => `\${${index + 1}:${param.name}}`).join(", ");
				insertString += `(${paramString})$0`;
			}
			completionItem.insertText = new vscode.SnippetString(insertString);
			completionItem.detail = `(${classMethod.visibility}) ${fieldsAndMethods.className}`;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			if (classMethod.api) {
				mardownString.appendMarkdown(classMethod.api);
			}
			mardownString.appendCodeblock(`${classMethod.name}(${classMethod.params.map(param => param.name).join(", ")}): ${classMethod.returnType || "void"}`);
			mardownString.appendMarkdown(classMethod.description);
			completionItem.documentation = mardownString;

			const position = vscode.window.activeTextEditor?.selection.start;
			const currentRange = position && vscode.window.activeTextEditor?.document.getWordRangeAtPosition(position);
			if (currentRange) {
				completionItem.range = currentRange;
			}

			return completionItem;
		});

		completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
			completionItem.kind = vscode.CompletionItemKind.Field;
			completionItem.insertText = classField.name;
			completionItem.detail = `(${classField.visibility}) ${classField.name}: ${classField.type ? classField.type : "any"}`;
			completionItem.documentation = classField.description;

			return completionItem;
		}));

		return completionItems;
	}

}