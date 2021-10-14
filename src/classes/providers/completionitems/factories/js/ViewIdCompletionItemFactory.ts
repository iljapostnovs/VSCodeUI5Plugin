import { XMLParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { InnerPropertiesStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/InnerPropertiesStrategy";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IXMLDocumentIdData } from "ui5plugin-parser/dist/classes/utils/XMLParser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class ViewIdCompletionItemFactory implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];

		const strategy = new InnerPropertiesStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
		const offset = document.offsetAt(position);
		const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const nodes = strategy.getStackOfNodesForInnerParamsForPosition(currentClassName, offset, true);
			if (nodes.length === 1 && nodes[0].callee?.property?.name === "byId") {
				const positionStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
				const classNameAtById = positionStrategy.getClassNameOfTheVariableAtPosition(currentClassName, nodes[0].callee?.property?.start);
				const isControl = classNameAtById && UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(classNameAtById, "sap.ui.core.Control");
				const isController = classNameAtById && UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(classNameAtById, "sap.ui.core.mvc.Controller");
				if (isControl || isController) {
					const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(currentClassName);
					const viewsAndFragments = UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
					const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
					const viewIdResult: IXMLDocumentIdData[] = [];
					XMLDocuments.forEach(XMLDocument => {
						viewIdResult.push(...XMLParser.getAllIDsInCurrentView(XMLDocument));
					});
					completionItems = this._generateCompletionItemsFromUICompletionItems(viewIdResult, document, position);
				}
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
			completionItem.detail = viewIdData.sourceClassName;
			completionItem.documentation = new vscode.MarkdownString(`\`\`\`xml \n${viewIdData.tagText.substring(0, 200)}...\n\`\`\``);
			completionItem.sortText = "z";
			completionItem.range = currentRange;

			return completionItem;
		});
	}
}