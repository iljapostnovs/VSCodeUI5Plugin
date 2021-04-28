import { SAPNodeDAO } from "../../librarydata/SAPNodeDAO";
import * as vscode from "vscode";
import { UI5MetadataPreloader } from "../../librarydata/UI5MetadataDAO";
import { SAPIcons } from "../../UI5Classes/SAPIcons";
import { ResourceModelData } from "../../UI5Classes/ResourceModelData";
import { StandardXMLCompletionItemFactory as StandardXMLCompletionItemFactory } from "./xml/StandardXMLCompletionItemFactory";
import { SAPUIDefineFactory } from "./js/sapuidefine/SAPUIDefineFactory";
import { ViewIdCompletionItemFactory } from "./js/ViewIdCompletionItemFactory";
import { JSDynamicCompletionItemsFactory } from "./js/JSDynamicCompletionItemsFactory";
import { XMLDynamicCompletionItemFactory } from "./xml/XMLDynamicCompletionItemFactory";
import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { CustomCompletionItem } from "./CustomCompletionItem";
import { GeneratorFactory } from "./codegenerators/GeneratorFactory";

export class CompletionItemFactory {
	private static readonly _nodeDAO = new SAPNodeDAO();
	public static XMLStandardLibCompletionItems: CustomCompletionItem[] = [];
	public static JSDefineCompletionItems: CustomCompletionItem[] = [];
	private readonly _language: GeneratorFactory.language;

	constructor(completionItemType: GeneratorFactory.language) {
		this._language = completionItemType;
	}

	public async createUIDefineCompletionItems(document?: vscode.TextDocument) {
		let completionItems: CustomCompletionItem[] = [];

		if (this._language === GeneratorFactory.language.js) {
			completionItems = await this._createJSCompletionItems(document);
		} else if (this._language === GeneratorFactory.language.xml) {
			if (CompletionItemFactory.XMLStandardLibCompletionItems.length === 0) {
				completionItems = await this._createXMLCompletionItems();
			} else {
				completionItems = CompletionItemFactory.XMLStandardLibCompletionItems;
			}
		}

		return completionItems;
	}

	private async _createXMLCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const SAPNodes = await CompletionItemFactory._nodeDAO.getAllNodes();

		const metadataPreloader: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([
			metadataPreloader.preloadLibs(),
			SAPIcons.preloadIcons(),
			ResourceModelData.readTexts()
		]);
		console.log("Libs are preloaded");

		const xmlClassFactoy = new StandardXMLCompletionItemFactory();
		completionItems = await xmlClassFactoy.generateAggregationPropertyCompletionItems();
		CompletionItemFactory.XMLStandardLibCompletionItems = completionItems;
		console.log("After the preload XML Completion Items are generated successfully");

		return completionItems;
	}

	private async _createJSCompletionItems(document?: vscode.TextDocument) {
		let completionItems: CustomCompletionItem[] = [];

		if (CompletionItemFactory.JSDefineCompletionItems.length === 0) {
			const UIDefineFactoy = new SAPUIDefineFactory();
			completionItems = await UIDefineFactoy.generateUIDefineCompletionItems();
			CompletionItemFactory.JSDefineCompletionItems = completionItems;
		} else {
			completionItems = CompletionItemFactory.JSDefineCompletionItems;

			if (document) {
				UIClassFactory.setNewContentForClassUsingDocument(document);
			}
			const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			if (currentClassName) {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const activeTextEditor = vscode.window.activeTextEditor;
				const position = activeTextEditor?.document.offsetAt(activeTextEditor.selection.start);
				if (position) {

					if (UIClass.fileContent) {
						const args = UIClass.fileContent?.body[0]?.expression?.arguments;
						if (args && args.length === 2) {
							const UIDefinePaths: string[] = args[0].elements || [];
							const node = AcornSyntaxAnalyzer.findAcornNode(UIDefinePaths, position);
							const isString = node?.type === "Literal";
							if (isString) {
								completionItems = completionItems.map(completionItem => {
									const completionItemWOQuotes = new CustomCompletionItem(completionItem.label);
									completionItemWOQuotes.kind = completionItem.kind;
									completionItemWOQuotes.className = completionItem.className;
									completionItemWOQuotes.insertText = (<any>completionItem.insertText).substring(1, (<any>completionItem.insertText).length - 1);
									completionItemWOQuotes.documentation = completionItem.documentation;
									completionItemWOQuotes.command = completionItem.command;

									return completionItemWOQuotes;
								});
							}
						}
					}
				}
			}
		}

		return completionItems;
	}

	public createViewIdCompletionItems() {
		const idCompletionItems = new ViewIdCompletionItemFactory();

		return idCompletionItems.createIdCompletionItems();
	}

	public createPropertyMethodCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		const jsDynamicFactory = new JSDynamicCompletionItemsFactory();
		UIClassFactory.setNewContentForClassUsingDocument(document);

		const completionItems = jsDynamicFactory.createUIClassCompletionItems(document, position);
		return completionItems;
	}

	public createXMLDynamicCompletionItems() {
		const xmlDynamicFactory = new XMLDynamicCompletionItemFactory();

		return xmlDynamicFactory.createXMLDynamicCompletionItems();
	}
}