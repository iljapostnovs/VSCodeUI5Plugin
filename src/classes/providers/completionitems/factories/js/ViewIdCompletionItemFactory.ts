import { UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { InnerPropertiesStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/InnerPropertiesStrategy";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IXMLDocumentIdData } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import * as vscode from "vscode";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import HTMLMarkdown from "../../../../utils/HTMLMarkdown";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class ViewIdCompletionItemFactory extends ParserBearer<UI5JSParser> implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];

		const strategy = new InnerPropertiesStrategy(this._parser.syntaxAnalyser, this._parser);
		const offset = document.offsetAt(position);
		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const nodes = strategy.getStackOfNodesForInnerParamsForPosition(currentClassName, offset, true);
			if (nodes.length === 1 && nodes[0].callee?.property?.name === "byId") {
				const positionStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
					this._parser.syntaxAnalyser,
					this._parser
				);
				const classNameAtById = positionStrategy
					.getClassNameOfTheVariableAtPosition(currentClassName, nodes[0].callee?.property?.start)
					?.split("|")[0]
					.trim();
				const isControl =
					classNameAtById &&
					this._parser.classFactory.isClassAChildOfClassB(classNameAtById, "sap.ui.core.Control");
				const isController =
					classNameAtById &&
					this._parser.classFactory.isClassAChildOfClassB(classNameAtById, "sap.ui.core.mvc.Controller");
				if (isControl || isController) {
					const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(currentClassName);
					const viewsAndFragments =
						this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
					const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
					const viewIdResult: IXMLDocumentIdData[] = [];
					XMLDocuments.forEach(XMLDocument => {
						viewIdResult.push(...this._parser.xmlParser.getAllIDsInCurrentView(XMLDocument));
					});
					completionItems = this._generateCompletionItemsFromUICompletionItems(
						viewIdResult,
						document,
						position
					);
				}
			}
		}
		//copy(JSON.stringify(completionItems.map(item => item.insertText)))

		return completionItems;
	}

	private _generateCompletionItemsFromUICompletionItems(
		viewIdData: IXMLDocumentIdData[],
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		const currentRange = document.getWordRangeAtPosition(position);
		return viewIdData.map(viewIdData => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(viewIdData.id);
			completionItem.kind = vscode.CompletionItemKind.Keyword;
			completionItem.insertText = viewIdData.id;
			completionItem.detail = viewIdData.sourceClassName;
			completionItem.documentation = new HTMLMarkdown(
				`\`\`\`xml \n${viewIdData.tagText.substring(0, 200)}...\n\`\`\``
			);
			completionItem.sortText = "z";
			completionItem.range = currentRange;

			return completionItem;
		});
	}
}
