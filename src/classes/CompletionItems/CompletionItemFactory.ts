import { SAPNodeDAO } from "../StandardLibMetadata/SAPNodeDAO";
import { SAPNode } from "../StandardLibMetadata/SAPNode";
import * as vscode from "vscode";
import { UI5MetadataPreloader } from "../StandardLibMetadata/UI5MetadataDAO";
import { SAPIcons } from "../CustomLibMetadata/SAPIcons";
import { ResourceModelData } from "../CustomLibMetadata/ResourceModelData";
import { XMLClassFactory as XMLClassFactory } from "./completionitemfactories/xml/XMLClassFactory";
import { UIDefineFactory } from "./completionitemfactories/javascript/UIDefineFactory";
import { IDFactory } from "./completionitemfactories/javascript/IDFactory";
import { JSDynamicFactory } from "./completionitemfactories/javascript/JSDynamicFactory";
import { XMLDynamicFactory } from "./completionitemfactories/xml/XMLDynamicFactory";
import { SyntaxAnalyzer } from "../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { CustomUIClass } from "../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";
import { GeneratorFactory } from "./completionitemfactories/codegenerators/GeneratorFactory";

export class CompletionItemFactory {
	private static readonly nodeDAO = new SAPNodeDAO();
	public static XMLStandardLibCompletionItems: vscode.CompletionItem[] = [];
	public static JSDefineCompletionItems: vscode.CompletionItem[] = [];
	private readonly language: GeneratorFactory.language;

	constructor(completionItemType: GeneratorFactory.language) {
		this.language = completionItemType;
	}

	public async getLanguageSpecificCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];

		if (this.language === GeneratorFactory.language.js) {
			completionItems = await this.generateJSCompletionItems();
		} else if (this.language === GeneratorFactory.language.xml) {
			if (CompletionItemFactory.XMLStandardLibCompletionItems.length === 0) {
				completionItems = await this.generateXMLCompletionItems();
			} else {
				completionItems = CompletionItemFactory.XMLStandardLibCompletionItems;
			}
		}

		return completionItems;
	}

	private async generateXMLCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		let SAPNodes: SAPNode[];
		SAPNodes = await CompletionItemFactory.nodeDAO.getAllNodes();

		const metadataPreloader: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
		await Promise.all([
			metadataPreloader.preloadLibs(),
			SAPIcons.preloadIcons(),
			ResourceModelData.readTexts()
		]);
		console.log("Libs are preloaded");

		const xmlClassFactoy = new XMLClassFactory();
		completionItems = await xmlClassFactoy.generateAggregationPropertyCompletionItems();
		CompletionItemFactory.XMLStandardLibCompletionItems = completionItems;
		console.log("After the preload XML Completion Items are generated successfully");

		return completionItems;
	}

	private async generateJSCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];

		if (CompletionItemFactory.JSDefineCompletionItems.length === 0) {
			const UIDefineFactoy = new UIDefineFactory();
			completionItems = await UIDefineFactoy.generateUIDefineCompletionItems();
			CompletionItemFactory.JSDefineCompletionItems = completionItems;
		} else {
			completionItems = CompletionItemFactory.JSDefineCompletionItems;

			SyntaxAnalyzer.setNewContentForCurrentUIClass();
			const currentClassName = SyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			if (currentClassName) {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				const activeTextEditor = vscode.window.activeTextEditor;
				const position = activeTextEditor?.document.offsetAt(activeTextEditor.selection.start);
				if (position) {

					if (UIClass.fileContent) {
						const args = UIClass.fileContent?.body[0]?.expression?.arguments;
						if (args && args.length === 2) {
							const UIDefinePaths: string[] = args[0].elements || [];
							const node = SyntaxAnalyzer.findAcornNode(UIDefinePaths, position);
							const isString = node?.type === "Literal";
							if (isString) {
								completionItems = completionItems.map(completionItem => {
									const completionItemWOQuotes = new vscode.CompletionItem(completionItem.label);
									completionItemWOQuotes.kind = completionItem.kind;
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

	public generateIdCompletionItems() {
		const idCompletionItems = new IDFactory();

		return idCompletionItems.generateIdCompletionItems();
	}

	public generateUIClassCompletionItems() {
		const jsDynamicFactory = new JSDynamicFactory();

		return jsDynamicFactory.generateUIClassCompletionItems();
	}

	public generateXMLDynamicCompletionItems() {
		const xmlDynamicFactory = new XMLDynamicFactory();

		return xmlDynamicFactory.generateXMLDynamicCompletionItems();
	}
}