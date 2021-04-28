import * as vscode from "vscode";
import { SAPNode } from "../../../librarydata/SAPNode";
import { URLBuilder } from "../../../utils/URLBuilder";
import { SAPNodeDAO } from "../../../librarydata/SAPNodeDAO";
import { UI5Plugin } from "../../../../UI5Plugin";
import { AbstractUIClass } from "../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { StandardUIClass } from "../../../UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { IPropertyGenerator } from "../codegenerators/property/interfaces/IPropertyGenerator";
import { GeneratorFactory } from "../codegenerators/GeneratorFactory";
import { IAggregationGenerator } from "../codegenerators/aggregation/interfaces/IAggregationGenerator";
import { SAPNodePropertyGenerationStrategy } from "../codegenerators/property/strategies/SAPNodePropertyGetterStrategy";
import { SAPClassAggregationGetterStrategy } from "../codegenerators/aggregation/strategies/SAPClassAggregationGetterStrategy";
import { SAPNodeAggregationGetterStrategy } from "../codegenerators/aggregation/strategies/SAPNodeAggregationGetterStrategy";
import { SAPClassPropertyGetterStrategy } from "../codegenerators/property/strategies/SAPClassPropertyGetterStrategy";
import { CustomCompletionItem } from "../CustomCompletionItem";

export class StandardXMLCompletionItemFactory {
	private readonly _nodeDAO = new SAPNodeDAO();

	async generateAggregationPropertyCompletionItems() {
		const availableProgressLeft = 50;
		let completionItems: CustomCompletionItem[] = [];
		const SAPNodes = this._nodeDAO.getAllNodesSync();

		// console.time("Generating completion items");
		for (const node of SAPNodes) {
			UI5Plugin.getInstance().initializationProgress?.report({
				message: "Generating Completion Items: " + node.getDisplayName(),
				increment: availableProgressLeft / SAPNodes.length
			});
			completionItems = completionItems.concat(this._generateClassCompletionItemsRecursively(node));
		}
		// console.timeEnd("Generating completion items");

		return completionItems;
	}

	private _generateClassCompletionItemsRecursively(node: SAPNode) {
		let completionItems: CustomCompletionItem[] = [];
		if (node.nodes && node.nodes.length > 0) {
			for (const childNode of node.nodes) {
				completionItems = completionItems.concat(this._generateClassCompletionItemsRecursively(childNode));
			}
		}

		if (node.getKind() === "class" && !node.getIsDeprecated() && (node.node.visibility === "public" || node.node.visibility === "protected")) {
			const metadata = node.getMetadata();
			const stereotype = metadata.getUI5Metadata()?.stereotype;

			if (metadata.getUI5Metadata() && (stereotype === "control" || stereotype === "element")) {
				const completionItem = this.generateXMLClassCompletionItemFromSAPNode(node);
				completionItems.push(completionItem);
			}
		}

		return completionItems;
	}

	public generateXMLClassCompletionItemFromSAPNode(node: SAPNode, classPrefix = "", prefixBeforeClassName = "") {
		const metadata = node.getMetadata()?.getRawMetadata();

		if (classPrefix && !classPrefix.endsWith(":")) {
			classPrefix += ":";
		}

		const mardownString = new vscode.MarkdownString();
		mardownString.isTrusted = true;
		mardownString.appendMarkdown(URLBuilder.getInstance().getMarkupUrlForClassApi(node));
		mardownString.appendMarkdown(StandardUIClass.removeTags(metadata.description));

		return this._generateXMLClassCompletionItemUsing({
			markdown: mardownString,
			insertText: this.generateClassInsertTextFromSAPNode(node, classPrefix, prefixBeforeClassName),
			detail: metadata?.title || "",
			className: node.getName()
		});
	}

	public generateXMLClassCompletionItemFromUIClass(UIClass: AbstractUIClass, classPrefix = "") {
		return this._generateXMLClassCompletionItemUsing({
			markdown: new vscode.MarkdownString("Custom class"),
			insertText: this.generateClassInsertTextFromSAPClass(UIClass, classPrefix),
			detail: UIClass.className,
			className: UIClass.className
		});
	}

	private _generateXMLClassCompletionItemUsing(data: { className: string, insertText: string, detail: string, markdown: vscode.MarkdownString }) {
		const className = data.className.split(".")[data.className.split(".").length - 1];
		const completionItem: CustomCompletionItem = new CustomCompletionItem(className);
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = data.insertText;
		completionItem.className = data.className;
		completionItem.detail = data.detail;
		completionItem.documentation = data.markdown;
		completionItem.sortText = "}";

		return completionItem;
	}

	public generateClassInsertTextFromSAPNode(node: SAPNode, classPrefix: string, prefixBeforeClassName = "") {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(GeneratorFactory.language.xml);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(GeneratorFactory.language.xml);

		const propertyGeneratorStrategy = new SAPNodePropertyGenerationStrategy(node);
		const aggregationGeneratorStrategy = new SAPNodeAggregationGetterStrategy(node);
		const properties: string = propertyGenerator.generateProperties(propertyGeneratorStrategy);
		const aggregations: string = aggregationGenerator.generateAggregations(aggregationGeneratorStrategy, classPrefix);

		return this._generateInsertStringFrom(node.getDisplayName(), properties, aggregations, classPrefix, prefixBeforeClassName);
	}

	public generateClassInsertTextFromSAPClass(UIClass: AbstractUIClass, classPrefix: string) {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(GeneratorFactory.language.xml);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(GeneratorFactory.language.xml);

		const propertyGeneratorStrategy = new SAPClassPropertyGetterStrategy(UIClass);
		const aggregationGeneratorStrategy = new SAPClassAggregationGetterStrategy(UIClass);
		const properties: string = propertyGenerator.generateProperties(propertyGeneratorStrategy);
		const aggregations: string = aggregationGenerator.generateAggregations(aggregationGeneratorStrategy, classPrefix);

		let className = UIClass.className;
		const classNameParts = className.split(".");
		className = classNameParts[classNameParts.length - 1];

		return this._generateInsertStringFrom(className, properties, aggregations, classPrefix);
	}

	private _generateInsertStringFrom(className: string, properties: string, aggregations: string, classPrefix: string, prefixBeforeClassName = "") {
		let insertText = `${prefixBeforeClassName}${className}\n`;
		insertText += properties;
		insertText += ">\n";
		insertText += aggregations;

		insertText += `</${classPrefix}${className}>`;

		return insertText;
	}
}