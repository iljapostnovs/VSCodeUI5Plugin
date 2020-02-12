import * as vscode from "vscode";
import { SAPNode } from "../../../StandardLibMetadata/SAPNode";
import { URLBuilder } from "../../../Util/URLBuilder";
import { GeneratorFactory } from "../../../CodeGenerators/GeneratorFactory";
import { IAggregationGenerator } from "../../../CodeGenerators/aggregation/IAggregationGenerator";
import { IPropertyGenerator } from "../../../CodeGenerators/property/IPropertyGenerator";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";

export class ClassFactory {
	private readonly nodeDAO = new SAPNodeDAO();

	async generateAggregationPropertyCompletionItems(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>) {
		var completionItems:vscode.CompletionItem[] = [];
		let SAPNodes: SAPNode[];
		const availableProgressLeft = 50;
		SAPNodes = await this.nodeDAO.getAllNodes();

		const promises = [];
		for (const node of SAPNodes) {
			const promise = this.generateAggregationCompletionItemsRecursively(node)
			.then((generatedItems) => {
				progress.report({
					message: "Generating Completion Items: " + node.getDisplayName(),
					increment: availableProgressLeft / SAPNodes.length
				});

				return generatedItems;
			});

			promises.push(promise);
		}

		const aGeneratedCompletionItemArrays = await Promise.all(promises);
		aGeneratedCompletionItemArrays.forEach(aGeneratedCompletionItems => {
			completionItems = completionItems.concat(aGeneratedCompletionItems);
		});

		return completionItems;
	}

	private async generateAggregationCompletionItemsRecursively(node: SAPNode) {
		var completionItems:vscode.CompletionItem[] = [];
		if (node.nodes && node.nodes.length > 0) {
			for (const childNode of node.nodes) {
				completionItems = completionItems.concat(await this.generateAggregationCompletionItemsRecursively(childNode));
			}
		}

		if (node.getKind() === "class" && !node.getIsDepricated() && node.node.visibility === "public") {
			const metadata = await node.getMetadata();
			const stereotype = metadata.getUI5Metadata() ? metadata.getUI5Metadata().stereotype : undefined;

			if (metadata.getUI5Metadata() && (stereotype === "control" || stereotype === "element")) {
				const completionItem = await this.generateClassAggregationCompletionItemFromSAPNode(node);
				completionItems.push(completionItem);
			}
		}

		return completionItems;
	}

	private async generateClassAggregationCompletionItemFromSAPNode(node: SAPNode) {
		const completionItem:vscode.CompletionItem = new vscode.CompletionItem(node.getName());
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = await this.generateClassInsertTextFor(node);
		const metadata = await node.getMetadata();
		completionItem.detail = metadata.rawMetadata.title;

		const mardownString = new vscode.MarkdownString();
		mardownString.isTrusted = true;
		mardownString.appendMarkdown(URLBuilder.getInstance().getMarkupUrlForClassApi(node));
		mardownString.appendMarkdown(metadata.rawMetadata.description);
		completionItem.documentation = mardownString;
		completionItem.sortText = "}";

		return completionItem;
	}

	private async generateClassInsertTextFor(node: SAPNode) {
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(GeneratorFactory.language.xml);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(GeneratorFactory.language.xml);
		const properties: string = await propertyGenerator.generateProperties(node);
		const aggregations: string = await aggregationGenerator.generateAggregations(node);

		let insertText: string = `${node.getDisplayName()}\n`;
		insertText += properties;
		insertText += ">\n";
		insertText += aggregations;

		insertText += `</${node.getDisplayName()}>`;
		return insertText;
	}
}