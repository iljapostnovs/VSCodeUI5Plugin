import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethods } from "../../../UI5Classes/UIClassFactory";

export class JSDynamicFactory {

	public generateUIClassCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		const fieldsAndMethods = AcornSyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable();
		if (fieldsAndMethods) {
			completionItems = this.generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods);
		}

		return completionItems;
	}

	private generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods) {
		let completionItems = fieldsAndMethods.methods.map(classMethod => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = vscode.CompletionItemKind.Method;

			const mandatoryParams = classMethod.params.filter(param => !param.endsWith("?"));
			const paramString = mandatoryParams.map((param, index) => `\${${index + 1}:${param}}`).join(", ");
			completionItem.insertText = new vscode.SnippetString(`${classMethod.name}(${paramString})$0`);
			completionItem.detail = `(${classMethod.visibility}) ${classMethod.name}`;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			if (classMethod.api) {
				//TODO: newline please, why dont you work
				mardownString.appendMarkdown(classMethod.api);
			}
			mardownString.appendCodeblock(classMethod.description);
			completionItem.documentation = mardownString;

			return completionItem;
		});

		completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classField.name);
			completionItem.kind = vscode.CompletionItemKind.Field;
			completionItem.insertText = classField.name;
			completionItem.detail = `(${classField.visibility}) ${classField.name}: ${classField.type ? classField.type : "any"}`;
			completionItem.documentation = classField.description;

			return completionItem;
		}));

		return completionItems;
	}

}