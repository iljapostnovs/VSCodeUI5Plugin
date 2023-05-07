import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { AbstractJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import * as vscode from "vscode";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import HTMLMarkdown from "../../../../utils/HTMLMarkdown";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { GeneratorFactory } from "../../codegenerators/GeneratorFactory";
import { IAggregationGenerator } from "../../codegenerators/aggregation/interfaces/IAggregationGenerator";
import { SAPClassAggregationGetterStrategy } from "../../codegenerators/aggregation/strategies/SAPClassAggregationGetterStrategy";
import { SAPNodeAggregationGetterStrategy } from "../../codegenerators/aggregation/strategies/SAPNodeAggregationGetterStrategy";
import { IPropertyGenerator } from "../../codegenerators/property/interfaces/IPropertyGenerator";
import { SAPClassPropertyGetterStrategy } from "../../codegenerators/property/strategies/SAPClassPropertyGetterStrategy";
import { SAPNodePropertyGenerationStrategy } from "../../codegenerators/property/strategies/SAPNodePropertyGetterStrategy";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class StandardXMLCompletionItemFactory extends ParserBearer implements ICompletionItemFactory {
	XMLStandardLibCompletionItems: CustomCompletionItem[] = [];
	async createCompletionItems() {
		return this.generateAggregationPropertyCompletionItems();
	}

	async preloadCompletionItems() {
		this.XMLStandardLibCompletionItems = await this.generateAggregationPropertyCompletionItems();
	}

	async generateAggregationPropertyCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const SAPNodes = this._parser.nodeDAO.getAllNodesSync();

		// console.time("Generating completion items");
		for (const node of SAPNodes) {
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

		if (
			node.getKind() === "class" &&
			!node.getIsDeprecated() &&
			(node.node.visibility === "public" || node.node.visibility === "protected")
		) {
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

		const mardownString = new HTMLMarkdown();
		mardownString.isTrusted = true;
		mardownString.appendMarkdown(this._parser.urlBuilder.getMarkupUrlForClassApi(node));
		mardownString.appendMarkdown(metadata.description);

		return this._generateXMLClassCompletionItemUsing({
			markdown: mardownString,
			insertText: this.generateClassInsertTextFromSAPNode(node, classPrefix, prefixBeforeClassName),
			detail: metadata?.title || "",
			className: node.getName()
		});
	}

	public generateXMLClassCompletionItemFromUIClass(UIClass: AbstractJSClass, classPrefix = "") {
		return this._generateXMLClassCompletionItemUsing({
			markdown: new HTMLMarkdown("Custom class"),
			insertText: this.generateClassInsertTextFromSAPClass(UIClass, classPrefix),
			detail: UIClass.className,
			className: UIClass.className
		});
	}

	private _generateXMLClassCompletionItemUsing(data: {
		className: string;
		insertText: string;
		detail: string;
		markdown: HTMLMarkdown;
	}) {
		const className = data.className.split(".")[data.className.split(".").length - 1];
		const completionItem: CustomCompletionItem = new CustomCompletionItem(className);
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = new vscode.SnippetString(data.insertText);
		completionItem.className = data.className;
		completionItem.detail = data.detail;
		completionItem.documentation = data.markdown;
		completionItem.sortText = "}";

		return completionItem;
	}

	public generateClassInsertTextFromSAPNode(node: SAPNode, classPrefix: string, prefixBeforeClassName = "") {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(
			GeneratorFactory.language.xml
		);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(
			GeneratorFactory.language.xml
		);

		const propertyGeneratorStrategy = new SAPNodePropertyGenerationStrategy(this._parser, node);
		const aggregationGeneratorStrategy = new SAPNodeAggregationGetterStrategy(this._parser, node);
		const properties: string = propertyGenerator.generateProperties(propertyGeneratorStrategy);
		const aggregations: string = aggregationGenerator.generateAggregations(
			aggregationGeneratorStrategy,
			classPrefix
		);

		return this._generateInsertStringFrom(
			node.getDisplayName(),
			properties,
			aggregations,
			classPrefix,
			prefixBeforeClassName
		);
	}

	public generateClassInsertTextFromSAPClass(UIClass: AbstractJSClass, classPrefix: string) {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(
			GeneratorFactory.language.xml
		);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(
			GeneratorFactory.language.xml
		);

		const propertyGeneratorStrategy = new SAPClassPropertyGetterStrategy(this._parser, UIClass);
		const aggregationGeneratorStrategy = new SAPClassAggregationGetterStrategy(this._parser, UIClass);
		const properties: string = propertyGenerator.generateProperties(propertyGeneratorStrategy);
		const aggregations: string = aggregationGenerator.generateAggregations(
			aggregationGeneratorStrategy,
			classPrefix
		);

		let className = UIClass.className;
		const classNameParts = className.split(".");
		className = classNameParts[classNameParts.length - 1];

		return this._generateInsertStringFrom(className, properties, aggregations, classPrefix);
	}

	private _generateInsertStringFrom(
		className: string,
		properties: string,
		aggregations: string,
		classPrefix: string,
		prefixBeforeClassName = ""
	) {
		let insertText = `${prefixBeforeClassName}${className}\n`;

		const shouldAttributesBeAdded = vscode.workspace.getConfiguration("ui5.plugin").get("addTagAttributes");
		const shouldAggregationsBeAdded = vscode.workspace.getConfiguration("ui5.plugin").get("addTagAggregations");

		if (shouldAttributesBeAdded) {
			insertText += properties;
		}
		insertText += ">\n";

		if (shouldAggregationsBeAdded) {
			insertText += aggregations;
		} else {
			insertText += "    $0\n";
		}

		insertText += `</${classPrefix}${className}>`;

		return insertText;
	}
}
