import * as vscode from "vscode";
import { XMLParser } from "../../../utils/XMLParser";
import { CustomCompletionItem } from "../../CustomCompletionItem";

export class IDFactory {
	public generateIdCompletionItems() {
		let completionItems:CustomCompletionItem[] = [];
		const viewIDs = XMLParser.getAllIDsInCurrentView();
		completionItems = this.generateCompletionItemsFromUICompletionItems(viewIDs);

		return completionItems;
	}

	private generateCompletionItemsFromUICompletionItems(viewIDs: string[]) {
		return viewIDs.map(viewId => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(viewId);
			completionItem.kind = vscode.CompletionItemKind.Keyword;
			completionItem.insertText = viewId;
			completionItem.detail = viewId;
			completionItem.documentation = viewId;
			completionItem.sortText = "z";

			return completionItem;
		});
	}
}