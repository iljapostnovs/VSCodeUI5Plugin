import { SAPNodeDAO } from "../StandardLibMetadata/SAPNodeDAO";
import { SAPNode } from "../StandardLibMetadata/SAPNode";
import * as vscode from "vscode";
import { GeneratorFactory } from "../CodeGenerators/GeneratorFactory";
import { UI5MetadataPreloader } from "../StandardLibMetadata/UI5MetadataDAO";
import { SAPIcons } from "../CustomLibMetadata/SAPIcons";
import { ResourceModelData } from "../CustomLibMetadata/ResourceModelData";
import { XMLClassFactory as XMLClassFactory } from "./completionitemfactories/xml/XMLClassFactory";
import { UIDefineFactory } from "./completionitemfactories/javascript/UIDefineFactory";
import { IDFactory } from "./completionitemfactories/javascript/IDFactory";
import { JSDynamicFactory } from "./completionitemfactories/javascript/JSDynamicFactory";
import { XMLDynamicFactory } from "./completionitemfactories/xml/XMLDynamicFactory";

export class CompletionItemFactory {
	private readonly nodeDAO = new SAPNodeDAO();
	private readonly language: GeneratorFactory.language;

	constructor(completionItemType: GeneratorFactory.language) {
		this.language = completionItemType;
	}

	public async getLanguageSpecificCompletionItems(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, context: vscode.ExtensionContext) {
		var completionItems:vscode.CompletionItem[] = [];

		if (this.language === GeneratorFactory.language.js) {
			const UIDefineFactoy = new UIDefineFactory();
			completionItems = await UIDefineFactoy.generateUIDefineCompletionItems();

		} else if (this.language === GeneratorFactory.language.xml) {
			let SAPNodes: SAPNode[];
			SAPNodes = await this.nodeDAO.getAllNodes();

			const metadataPreloader: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
			await Promise.all([
				metadataPreloader.preloadLibs(progress),
				SAPIcons.preloadIcons(),
				ResourceModelData.readTexts()
			]);
			console.log("Libs are preloaded");

			const xmlClassFactoy = new XMLClassFactory();
			completionItems = await xmlClassFactoy.generateAggregationPropertyCompletionItems(progress);
			console.log("After the preload XML Completion Items are generated successfully");
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