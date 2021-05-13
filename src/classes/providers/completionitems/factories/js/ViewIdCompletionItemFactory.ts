import * as vscode from "vscode";
import { InnerPropertiesStrategy } from "../../../../UI5Classes/JSParser/strategies/InnerPropertiesStrategy";
import { CustomUIClass } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../utils/FileReader";
import { XMLParser } from "../../../../utils/XMLParser";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class ViewIdCompletionItemFactory implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];

		const strategy = new InnerPropertiesStrategy();
		const offset = document.offsetAt(position);
		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const nodes = strategy.getStackOfNodesForInnerParamsForPosition(currentClassName, offset, true);
			if (nodes.length === 1 && nodes[0].callee?.property?.name === "byId") {

				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const viewsAndFragments = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
				const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
				const viewIds: string[] = [];
				XMLDocuments.forEach(XMLDocument => {
					viewIds.push(...XMLParser.getAllIDsInCurrentView(XMLDocument));
				});
				completionItems = this._generateCompletionItemsFromUICompletionItems(viewIds, document, position);
			}
		}
		//copy(JSON.stringify(completionItems.map(item => item.insertText)))

		return completionItems;
	}

	private _generateCompletionItemsFromUICompletionItems(viewIDs: string[], document: vscode.TextDocument, position: vscode.Position) {
		const currentRange = document.getWordRangeAtPosition(position);
		const uniqueViewIds = [...new Set(viewIDs)];
		return uniqueViewIds.map(viewId => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(viewId);
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