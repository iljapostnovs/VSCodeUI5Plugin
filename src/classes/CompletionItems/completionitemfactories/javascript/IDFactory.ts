import * as vscode from "vscode";
import { XMLParser } from "../../../Util/XMLParser";

export class IDFactory {
	public generateIdCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		const viewIDs = XMLParser.getAllIDsInCurrentView();
		completionItems = this.generateCompletionItemsFromUICompletionItems(viewIDs);

		return completionItems;
	}

	private generateCompletionItemsFromUICompletionItems(viewIDs: string[]) {
		return viewIDs.map(viewId => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(viewId);
			completionItem.kind = vscode.CompletionItemKind.Keyword;
			completionItem.insertText = viewId;
			completionItem.detail = viewId;
			completionItem.documentation = viewId;

			return completionItem;
		});
	}
}