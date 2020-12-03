import { SAPNodeDAO } from "../librarydata/SAPNodeDAO";
import { SAPNode } from "../librarydata/SAPNode";
import * as vscode from "vscode";
import { UI5MetadataPreloader } from "../librarydata/UI5MetadataDAO";
import { SAPIcons } from "../UI5Classes/SAPIcons";
import { ResourceModelData } from "../UI5Classes/ResourceModelData";
import { XMLClassFactory as XMLClassFactory } from "./completionitemfactories/xml/XMLClassFactory";
import { UIDefineFactory } from "./completionitemfactories/javascript/UIDefineFactory";
import { IDFactory } from "./completionitemfactories/javascript/IDFactory";
import { JSDynamicFactory } from "./completionitemfactories/javascript/JSDynamicFactory";
import { XMLDynamicFactory } from "./completionitemfactories/xml/XMLDynamicFactory";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { GeneratorFactory } from "./completionitemfactories/codegenerators/GeneratorFactory";
import { CustomCompletionItem } from "./CustomCompletionItem";

export class CompletionItemFactory {
	private static readonly nodeDAO = new SAPNodeDAO();
	public static XMLStandardLibCompletionItems: CustomCompletionItem[] = [];
	public static JSDefineCompletionItems: CustomCompletionItem[] = [];
	private readonly language: GeneratorFactory.language;

	constructor(completionItemType: GeneratorFactory.language) {
		this.language = completionItemType;
	}

	public async getUIDefineCompletionItems() {
		let completionItems:CustomCompletionItem[] = [];

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
		let completionItems:CustomCompletionItem[] = [];
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
		let completionItems:CustomCompletionItem[] = [];

		if (CompletionItemFactory.JSDefineCompletionItems.length === 0) {
			const UIDefineFactoy = new UIDefineFactory();
			completionItems = await UIDefineFactoy.generateUIDefineCompletionItems();
			CompletionItemFactory.JSDefineCompletionItems = completionItems;
		} else {
			completionItems = CompletionItemFactory.JSDefineCompletionItems;

			UIClassFactory.setNewContentForCurrentUIClass();
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

	public generateViewIdCompletionItems() {
		const idCompletionItems = new IDFactory();

		return idCompletionItems.generateIdCompletionItems();
	}

	public generatePropertyMethodCompletionItems() {
		const jsDynamicFactory = new JSDynamicFactory();
		UIClassFactory.setNewContentForCurrentUIClass();

		return jsDynamicFactory.generateUIClassCompletionItems();
	}

	public generateXMLDynamicCompletionItems() {
		const xmlDynamicFactory = new XMLDynamicFactory();

		return xmlDynamicFactory.generateXMLDynamicCompletionItems();
	}
}