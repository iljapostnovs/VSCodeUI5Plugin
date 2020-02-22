import * as vscode from "vscode";
import { SAPNode } from "../../../StandardLibMetadata/SAPNode";
import { URLBuilder } from "../../../Util/URLBuilder";
import { GeneratorFactory } from "../../../CodeGenerators/GeneratorFactory";
import { IAggregationGenerator } from "../../../CodeGenerators/aggregation/IAggregationGenerator";
import { IPropertyGenerator } from "../../../CodeGenerators/property/IPropertyGenerator";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { UI5Plugin } from "../../../../UI5Plugin";

export class XMLClassFactory {
	private readonly nodeDAO = new SAPNodeDAO();

	async generateAggregationPropertyCompletionItems() {
		var completionItems:vscode.CompletionItem[] = [];
		let SAPNodes: SAPNode[];
		const availableProgressLeft = 50;
		SAPNodes = this.nodeDAO.getAllNodesSync();

		console.time("Generating compl. items");
		for (const node of SAPNodes) {
			UI5Plugin.getInstance().initializationProgress?.report({
				message: "Generating Completion Items: " + node.getDisplayName(),
				increment: availableProgressLeft / SAPNodes.length
			});
			completionItems = completionItems.concat(this.generateClassCompletionItemsRecursively(node));
		}
		console.timeEnd("Generating compl. items");

		return completionItems;
	}

	private generateClassCompletionItemsRecursively(node: SAPNode) {
		var completionItems:vscode.CompletionItem[] = [];
		if (node.nodes && node.nodes.length > 0) {
			for (const childNode of node.nodes) {
				completionItems = completionItems.concat(this.generateClassCompletionItemsRecursively(childNode));
			}
		}

		if (node.getKind() === "class" && !node.getIsDepricated() && node.node.visibility === "public") {
			const metadata = node.getMetadata();
			const stereotype = metadata.getUI5Metadata()?.stereotype;

			if (metadata.getUI5Metadata() && (stereotype === "control" || stereotype === "element")) {
				const completionItem = this.generateClassAggregationCompletionItemFromSAPNode(node);
				completionItems.push(completionItem);
			}
		}

		return completionItems;
	}

	public generateClassAggregationCompletionItemFromSAPNode(node: SAPNode, classPrefix: string = "") {
		const completionItem:vscode.CompletionItem = new vscode.CompletionItem(node.getName());
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = this.generateClassInsertTextFor(node, classPrefix);
		const metadata = node.getMetadata();
		completionItem.detail = metadata?.rawMetadata.title;

		const mardownString = new vscode.MarkdownString();
		mardownString.isTrusted = true;
		mardownString.appendMarkdown(URLBuilder.getInstance().getMarkupUrlForClassApi(node));
		mardownString.appendMarkdown(metadata?.rawMetadata.description);//TODO: Remove tags
		completionItem.documentation = mardownString;
		completionItem.sortText = "}";

		return completionItem;
	}

	public generateClassInsertTextFor(node: SAPNode, classPrefix: string) {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(GeneratorFactory.language.xml);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(GeneratorFactory.language.xml);
		const properties: string = propertyGenerator.generateProperties(node);
		const aggregations: string = aggregationGenerator.generateAggregations(node, classPrefix);

		let insertText: string = `${node.getDisplayName()}\n`;
		insertText += properties;
		insertText += ">\n";
		insertText += aggregations;

		insertText += `</${classPrefix}${node.getDisplayName()}>`;
		return insertText;
	}
}