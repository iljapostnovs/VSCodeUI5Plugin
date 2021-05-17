import * as vscode from "vscode";
import { InnerPropertiesStrategy } from "../../../../UI5Classes/JSParser/strategies/InnerPropertiesStrategy";
import { CustomUIClass } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../../utils/FileReader";
import { IXMLDocumentIdData, XMLParser } from "../../../../utils/XMLParser";
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
				const viewsAndFragments = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, false);
				const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
				const viewIdResult: IXMLDocumentIdData[] = [];
				XMLDocuments.forEach(XMLDocument => {
					viewIdResult.push(...XMLParser.getAllIDsInCurrentView(XMLDocument));
				});
				completionItems = this._generateCompletionItemsFromUICompletionItems(viewIdResult, document, position);
			}
		}
		//copy(JSON.stringify(completionItems.map(item => item.insertText)))

		return completionItems;
	}

	private _generateCompletionItemsFromUICompletionItems(viewIdData: IXMLDocumentIdData[], document: vscode.TextDocument, position: vscode.Position) {
		const currentRange = document.getWordRangeAtPosition(position);
		return viewIdData.map(viewIdData => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(viewIdData.id);
			completionItem.kind = vscode.CompletionItemKind.Keyword;
			completionItem.insertText = viewIdData.id;
			completionItem.detail = viewIdData.className;
			completionItem.documentation = new vscode.MarkdownString(viewIdData.id + `  \n\`\`\`xml \n${viewIdData.tagText.substring(0, 200)}...\n\`\`\``);
			completionItem.sortText = "z";
			completionItem.range = currentRange;

			return completionItem;
		});
	}
}