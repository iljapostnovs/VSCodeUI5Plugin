import { SAPNodeDAO } from "../StandardLibMetadata/SAPNodeDAO";
import { SAPNode } from "../StandardLibMetadata/SAPNode";
import * as vscode from "vscode";
import { IPropertyGenerator } from "../CodeGenerators/property/IPropertyGenerator";
import { GeneratorFactory } from "../CodeGenerators/GeneratorFactory";
import { IAggregationGenerator } from "../CodeGenerators/aggregation/IAggregationGenerator";
import { UI5MetadataPreloader } from "../StandardLibMetadata/UI5MetadataDAO";
import { SyntaxAnalyzer, UICompletionItem } from "../CustomLibMetadata/SyntaxAnalyzer";
import { WorkspaceCompletionItemFactory } from "./WorkspaceCompletionItemFactory";
import { FieldsAndMethods, UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { XMLParser, PositionType } from "../Util/XMLParser";
import { AbstractUIClass, UIProperty } from "../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { URLBuilder } from "../Util/URLBuilder";

export class CompletionItemFactory {
	private readonly nodeDAO = new SAPNodeDAO();
	private readonly language: GeneratorFactory.language;

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

			const metadataProvider: UI5MetadataPreloader = new UI5MetadataPreloader(SAPNodes);
			await metadataProvider.preloadLibs(progress);
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
		const propertyGenerator: IPropertyGenerator = GeneratorFactory.getPropertyGenerator(this.language);
		const aggregationGenerator: IAggregationGenerator = GeneratorFactory.getAggregationGenerator(this.language);
		const properties: string = await propertyGenerator.generateProperties(node);
		const aggregations: string = await aggregationGenerator.generateAggregations(node);

		let insertText: string = node.getDisplayName() + "\n";
		insertText += properties;
		insertText += ">\n";
		insertText += aggregations;

		insertText += "</" + node.getDisplayName() + ">";
		return insertText;
	}

	public async generateUIDefineCompletionItems() {
		const workspaceCompletionItemDAO = new WorkspaceCompletionItemFactory();
		let completionItems:vscode.CompletionItem[] = [];

		const SAPNodes: SAPNode[] = await this.nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(await this.recursiveUIDefineCompletionItemGeneration(node));
		}

		completionItems = completionItems.concat(await workspaceCompletionItemDAO.getCompletionItems());

		return completionItems;
	}

	private async recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems:vscode.CompletionItem[] = [];
		const defineGenerator = GeneratorFactory.getDefineGenerator();
		const insertText = await defineGenerator.generateDefineString(node);

		if (insertText) {
			const metadata = await node.getMetadata();

			const completionItem = new vscode.CompletionItem(insertText);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = insertText;
			completionItem.detail = metadata.rawMetadata.title;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			mardownString.appendMarkdown(URLBuilder.getInstance().getMarkupUrlForClassApi(node));
			mardownString.appendMarkdown(metadata.rawMetadata.description);
			completionItem.documentation = mardownString;

			completionItems.push(completionItem);
		}

		if (node.nodes) {
			for (const nextNode of node.nodes) {
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
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = classMethod.type;
			completionItem.insertText = classMethod.name;
			completionItem.detail = classMethod.description;
			completionItem.documentation = classMethod.description;

			return completionItem;
		});
	}

	public generateUIClassCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		const fieldsAndMethods = SyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable();
		if (fieldsAndMethods) {
			completionItems = this.generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods);
		}

		return completionItems;
	}

	private generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods) {
		let completionItems = fieldsAndMethods.methods.map(classMethod => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classMethod.name);
			completionItem.kind = vscode.CompletionItemKind.Method;

			const mandatoryParams = classMethod.params.filter(param => !param.endsWith("?"));
			const paramString = mandatoryParams.map((param, index) => `\${${index + 1}:${param}}`).join(", ");
			completionItem.insertText = new vscode.SnippetString(`${classMethod.name}(${paramString})$0`);
			completionItem.detail = classMethod.name;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			if (classMethod.api) {
				//TODO: newline please, why dont you work
				mardownString.appendMarkdown(classMethod.api);
			}
			mardownString.appendCodeblock(classMethod.description);
			completionItem.documentation = mardownString;

			return completionItem;
		});

		completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(classField.name);
			completionItem.kind = vscode.CompletionItemKind.Field;
			completionItem.insertText = classField.name;
			completionItem.detail = classField.name;
			completionItem.documentation = classField.description;

			return completionItem;
		}));

		return completionItems;
	}

	public generateXMLDynamicCompletionItems() {
		let completionItems:vscode.CompletionItem[] = [];
		const textEditor = vscode.window.activeTextEditor;

		if (textEditor) {
			const document = textEditor.document;
			const currentPositionOffset = document.offsetAt(textEditor.selection.start);
			const XMLText = document.getText();
			const positionType = XMLParser.getPositionType(XMLText, currentPositionOffset);

			if (positionType === PositionType.InTheTag) {
				const className = XMLParser.getClassNameInPosition(XMLText, currentPositionOffset);
				if (className) {
					const UIClass = UIClassFactory.getUIClass(className);
					completionItems = this.getPropertyCompletionItemsFromClass(UIClass);
					completionItems = completionItems.concat(this.getEventCompletionItemsFromClass(UIClass));
					completionItems = completionItems.concat(this.getAggregationCompletionItemsFromClass(UIClass));
					completionItems = completionItems.concat(this.getAssociationCompletionItemsFromClass(UIClass));
					completionItems = this.removeDuplicateCompletionItems(completionItems);
				}
			} else if (positionType === PositionType.InTheString) {
				const positionBeforeString = XMLParser.getPositionBeforeStringBegining(XMLText, currentPositionOffset);

				const className = XMLParser.getClassNameInPosition(XMLText, positionBeforeString);
				if (className) {
					const UIClass = UIClassFactory.getUIClass(className);
					const propertyName = XMLParser.getNearestProperty(XMLText, positionBeforeString);
					const UIProperty = this.getUIPropertyRecursively(UIClass, propertyName);
					if (UIProperty && UIProperty.typeValues.length > 0) {
						completionItems = this.generateCompletionItemsFromTypeValues(UIProperty.typeValues);
					}
				}
			}

		}

		return completionItems;
	}

	private getUIPropertyRecursively(UIClass: AbstractUIClass, propertyName: string): UIProperty | undefined {
		let property: UIProperty | undefined;
		property = UIClass.properties.find(property => property.name === propertyName);
		if (!property && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			property = this.getUIPropertyRecursively(parentClass, propertyName);
		}

		return property;
	}

	private generateCompletionItemsFromTypeValues(typeValues: string[]) {
		return typeValues.map(typeValue => {
			return new vscode.CompletionItem(typeValue, vscode.CompletionItemKind.Keyword);
		});
	}

	private getPropertyCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:vscode.CompletionItem[] = [];

		completionItems = UIClass.properties.map(property => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(property.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			const insertTextValues = property.typeValues.length > 0 ? `|${property.typeValues.join(",")}|` : "";
			completionItem.insertText =  new vscode.SnippetString(`${property.name}="\${1${insertTextValues}}"$0`);
			completionItem.detail = `${property.name}: ${property.type}`;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForPropertiesApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${property.description}`);

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getPropertyCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private getEventCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:vscode.CompletionItem[] = [];

		completionItems = UIClass.events.map(event => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(event.name);
			completionItem.kind = vscode.CompletionItemKind.Event;
			completionItem.insertText = new vscode.SnippetString(`${event.name}="\${1}"$0`);
			completionItem.detail = event.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForEventsApi(UIClass, event.name);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${event.description}`);

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getEventCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private getAggregationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:vscode.CompletionItem[] = [];

		completionItems = UIClass.aggregations.map(aggregation => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${aggregation.name}="\${1}"$0`);
			completionItem.detail = aggregation.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAggregationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${aggregation.description}`);

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getAggregationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private getAssociationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:vscode.CompletionItem[] = [];

		completionItems = UIClass.associations.map(association => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(association.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${association.name}="\${1}"$0`);
			completionItem.detail = association.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAssociationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${association.description}`);

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getAssociationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private removeDuplicateCompletionItems(completionItems: vscode.CompletionItem[]) {
		completionItems = completionItems.reduce((accumulator: vscode.CompletionItem[], completionItem: vscode.CompletionItem) => {
			const methodInAccumulator = accumulator.find(accumulatedCompletionItem => accumulatedCompletionItem.label === completionItem.label);
			if (!methodInAccumulator) {
				accumulator.push(completionItem);
			}
			return accumulator;
		}, []);

		return completionItems;
	}
}