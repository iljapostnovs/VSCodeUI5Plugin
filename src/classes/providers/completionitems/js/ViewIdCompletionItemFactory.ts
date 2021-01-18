import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { InnerPropertiesStrategy } from "../../../UI5Classes/JSParser/strategies/InnerPropertiesStrategy";
import { XMLParser } from "../../../utils/XMLParser";
import { CustomCompletionItem } from "../CustomCompletionItem";

export class ViewIdCompletionItemFactory {
	public generateIdCompletionItems() {
		let completionItems:CustomCompletionItem[] = [];

		const strategy = new InnerPropertiesStrategy();
		const activeTextEditor = vscode.window.activeTextEditor;
		const position = activeTextEditor?.document.offsetAt(activeTextEditor.selection.start);
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClassName && position) {
			const nodes = strategy.getStackOfNodesForInnerParamsForPosition(currentClassName, position, true);
			if (nodes.length === 1 && nodes[0].callee?.property?.name === "byId") {
				const viewIDs = XMLParser.getAllIDsInCurrentView();
				completionItems = this._generateCompletionItemsFromUICompletionItems(viewIDs);
			}
		}

		return completionItems;
	}

	private _generateCompletionItemsFromUICompletionItems(viewIDs: string[]) {
		const position = vscode.window.activeTextEditor?.selection.start;
		const currentRange = position && vscode.window.activeTextEditor?.document.getWordRangeAtPosition(position);

		return viewIDs.map(viewId => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(viewId);
			completionItem.kind = vscode.CompletionItemKind.Keyword;
			completionItem.insertText = viewId;
			completionItem.detail = viewId;
			completionItem.documentation = viewId;
			completionItem.sortText = "z";
			completionItem.range = currentRange;

			return completionItem;
		});
	}
}