import { SAPNodeDAO } from "./SAPNodeDAO";
import { SAPNode } from "../SAPNode";
import * as vscode from "vscode";
import { IPropertyGenerator } from "../generators/property/IPropertyGenerator";
import { GeneratorFactory } from "../generators/GeneratorFactory";
import { IAggregationGenerator } from "../generators/aggregation/IAggregationGenerator";
import { UI5MetadataPreloader } from "./UI5MetadataDAO";
import { WorkspaceCompletionItemDAO } from "./WorkspaceCompletionItemDAO";
import { SyntaxAnalyzer, UICompletionItem } from "../SyntaxAnalyzer";
import { FieldsAndMethods } from "./UIClassDAO";

export class CompletionItemDAO {
	private nodeDAO = new SAPNodeDAO();
	private language: GeneratorFactory.language;

	constructor(completionItemType: GeneratorFactory.language) {
		this.language = completionItemType;
	}

	public async getLanguageSpecificCompletionItems(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, context: vscode.ExtensionContext) {
		var completionItems:vscode.CompletionItem[] = [];

		if (this.language === GeneratorFactory.language.js) {
			completionItems = await this.generateUIDefineCompletionItems();

		} else if (this.language === GeneratorFactory.language.xml) {
			let SAPNodes: SAPNode[];
			SAPNodes = await this.nodeDAO.getAllNodes();

			let metadataProvider: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
			await metadataProvider.preloadLibs(progress, context);
			console.log("Libs are preloaded");

			completionItems = await this.generateAggregationPropertyCompletionItems(progress);
			console.log("After the preload XML Completion Items are generated successfully");
		}

		return completionItems;
	}

	private async generateAggregationPropertyCompletionItems(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>) {
		var completionItems:vscode.CompletionItem[] = [];
		let SAPNodes: SAPNode[];
		const availableProgressLeft = 50;
		SAPNodes = await this.nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			progress.report({
				message: "Generating Completion Items: " + node.getDisplayName(),
				increment: availableProgressLeft / SAPNodes.length
			});
			await this.generateAggregationCompletionItemsRecursively(node)
			.then((newCompletionItems) => {
				completionItems = completionItems.concat(newCompletionItems);
			});
		}

		return completionItems;
	}

	private async generateAggregationCompletionItemsRecursively(node: SAPNode) {
		var completionItems:vscode.CompletionItem[] = [];
		if (node.nodes && node.nodes.length > 0) {
			for (const childNode of node.nodes) {
				completionItems = completionItems.concat(await this.generateAggregationCompletionItemsRecursively(childNode));
			}
		}

		if (node.getKind() === "class" && !node.getIsDepricated()) {
			let metadata = await node.getMetadata();
			let stereotype = metadata.getUI5Metadata() ? metadata.getUI5Metadata().stereotype : undefined;

			if (metadata.getUI5Metadata() && (stereotype === "control" || stereotype === "element")) {
				let completionItem = await this.generateClassAggregationCompletionItemFromSAPNode(node);
				completionItems.push(completionItem);
			}
		}

		return completionItems;
	}

	private async generateClassAggregationCompletionItemFromSAPNode(node: SAPNode) {
		let completionItem:vscode.CompletionItem = new vscode.CompletionItem(node.getName());
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = await this.generateClassInsertTextFor(node);
		let metadata = await node.getMetadata();
		completionItem.detail = metadata.rawMetadata.title;

		let mardownString = new vscode.MarkdownString();
		mardownString.isTrusted = true;
		mardownString.appendMarkdown("[ui5.com](https://ui5.sap.com/#/api/" + node.getName() + ")\n");
		mardownString.appendMarkdown(metadata.rawMetadata.description);
		completionItem.documentation = mardownString;

		return completionItem;
	}

	private async generateClassInsertTextFor(node: SAPNode) {
		let propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(this.language);
		let aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(this.language);
		let properties: string = await propertyGenerator.generateProperties(node);
		let aggregations: string = await aggregationGenerator.generateAggregations(node);

		let insertText: string = node.getDisplayName() + "\n";
		insertText += properties;
		insertText += ">\n"
		insertText += aggregations;

		insertText += "</" + node.getDisplayName() + ">";
		return insertText;
	}

	public async generateUIDefineCompletionItems() {
		let workspaceCompletionItemDAO = new WorkspaceCompletionItemDAO();
		let completionItems:vscode.CompletionItem[] = [];

		let SAPNodes: SAPNode[] = await this.nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(await this.recursiveUIDefineCompletionItemGeneration(node));
		}

		completionItems = completionItems.concat(await workspaceCompletionItemDAO.getCompletionItems());

		return completionItems;
	}

	private async recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems:vscode.CompletionItem[] = [];
		let defineGenerator = GeneratorFactory.getDefineGenerator();
		let insertText = await defineGenerator.generateDefineString(node);

		if (insertText) {
			let metadata = await node.getMetadata();

			let completionItem = new vscode.CompletionItem(insertText);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = insertText;
			completionItem.detail = metadata.rawMetadata.title;

			let mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			mardownString.appendMarkdown("[UI5 API](https://ui5.sap.com/#/api/" + node.getName() + ")\n");
			mardownString.appendMarkdown(metadata.rawMetadata.description);
			completionItem.documentation = mardownString;

			completionItems.push(completionItem);
		}

		if (node.nodes) {
			for (let nextNode of node.nodes) {
				completionItems = completionItems.concat(await this.recursiveUIDefineCompletionItemGeneration(nextNode));
			}
		}

		return completionItems;
	}

	public generateIdCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		let UICompletionItems:UICompletionItem[] = [];
		UICompletionItems = SyntaxAnalyzer.getUICompletionItemsWithUniqueViewIds();

		completionItems = this.generateCompletionItemsFromUICompletionItems(UICompletionItems);

		return completionItems;
	}

	private generateCompletionItemsFromUICompletionItems(UICompletionItems: UICompletionItem[]) {
		return UICompletionItems.map(classMethod => {
			let completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = classMethod.type;
			completionItem.insertText = classMethod.name;
			completionItem.detail = classMethod.description;
			completionItem.documentation = classMethod.description;

			return completionItem;
		});
	}

	public generateUIClassCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		let fieldsAndMethods = SyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable();
		if (fieldsAndMethods) {
			completionItems = this.generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods);
		}

		return completionItems;
	}

	private generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods) {
		let completionItems = fieldsAndMethods.methods.map(classMethod => {
			let completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = vscode.CompletionItemKind.Method;
			completionItem.insertText = classMethod.name;
			completionItem.detail = classMethod.name;
			completionItem.documentation = classMethod.description;

			return completionItem;
		});

		completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
			let completionItem:vscode.CompletionItem = new vscode.CompletionItem(classField.name);
			completionItem.kind = vscode.CompletionItemKind.Field;
			completionItem.insertText = classField.name;
			completionItem.detail = classField.name;
			completionItem.documentation = classField.description;

			return completionItem;
		}));

		return completionItems;
	}
}