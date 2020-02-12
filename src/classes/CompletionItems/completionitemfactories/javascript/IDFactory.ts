import * as vscode from "vscode";
import { SyntaxAnalyzer, UICompletionItem } from "../../../CustomLibMetadata/SyntaxAnalyzer";

export class IDFactory {
	public generateIdCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		let UICompletionItems:UICompletionItem[] = [];
		UICompletionItems = SyntaxAnalyzer.getUICompletionItemsWithUniqueViewIds();

		completionItems = this.generateCompletionItemsFromUICompletionItems(UICompletionItems);

		return completionItems;
	}

	private generateCompletionItemsFromUICompletionItems(UICompletionItems: UICompletionItem[]) {
		return UICompletionItems.map(classMethod => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = classMethod.type;
			completionItem.insertText = classMethod.name;
			completionItem.detail = classMethod.description;
			completionItem.documentation = classMethod.description;

			return completionItem;
		});
	}
}