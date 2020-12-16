import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethods } from "../../../UI5Classes/UIClassFactory";
import { CustomCompletionItem } from "../../CustomCompletionItem";

export class JSDynamicFactory {

	public generateUIClassCompletionItems() {
		let completionItems:CustomCompletionItem[] = [];
		const fieldsAndMethods = AcornSyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable();
		if (fieldsAndMethods) {
			completionItems = this.generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods);
		}

		return completionItems;
	}

	private generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods) {
		let completionItems = fieldsAndMethods.methods.map(classMethod => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(classMethod.name);
			completionItem.kind = vscode.CompletionItemKind.Method;

			const mandatoryParams = classMethod.params.filter(param => !param.endsWith("?"));
			const paramString = mandatoryParams.map((param, index) => `\${${index + 1}:${param}}`).join(", ");
			completionItem.insertText = new vscode.SnippetString(`${classMethod.name}(${paramString})$0`);
			completionItem.detail = `(${classMethod.visibility}) ${fieldsAndMethods.className}`;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			if (classMethod.api) {
				//TODO: newline please, why dont you work
				mardownString.appendMarkdown(classMethod.api);
			}
			mardownString.appendCodeblock(`${classMethod.name}(${classMethod.params.join(", ")}): ${classMethod.returnType || "void"}`);
			mardownString.appendMarkdown(classMethod.description);
			completionItem.documentation = mardownString;

			return completionItem;
		});

		completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(classField.name);
			completionItem.kind = vscode.CompletionItemKind.Field;
			completionItem.insertText = classField.name;
			completionItem.detail = `(${classField.visibility}) ${classField.name}: ${classField.type ? classField.type : "any"}`;
			completionItem.documentation = classField.description;

			return completionItem;
		}));

		return completionItems;
	}

}