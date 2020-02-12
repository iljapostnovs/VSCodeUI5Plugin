import * as vscode from "vscode";
import { UIClassFactory } from "../../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { AbstractUIClass, TypeValue, UIProperty, UIEvent } from "../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { URLBuilder } from "../../../Util/URLBuilder";
import { XMLParser, PositionType } from "../../../Util/XMLParser";

export class XMLDynamicFactory {
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
					let controllerMethods = XMLParser.getMethodsOfTheCurrentViewsController().map(method => method.name);
					controllerMethods = [...new Set(controllerMethods)];
					completionItems = this.getPropertyCompletionItemsFromClass(UIClass);
					completionItems = completionItems.concat(this.getEventCompletionItemsFromClass(UIClass, controllerMethods));
					completionItems = completionItems.concat(this.getAggregationCompletionItemsFromClass(UIClass));
					completionItems = completionItems.concat(this.getAssociationCompletionItemsFromClass(UIClass));
				}
			} else if (positionType === PositionType.InTheString) {
				const positionBeforeString = XMLParser.getPositionBeforeStringBegining(XMLText, currentPositionOffset);

				const className = XMLParser.getClassNameInPosition(XMLText, positionBeforeString);
				if (className) {
					const UIClass = UIClassFactory.getUIClass(className);
					const attributeName = XMLParser.getNearestAttribute(XMLText, positionBeforeString);
					const UIProperty = this.getUIPropertyRecursively(UIClass, attributeName);
					if (UIProperty && UIProperty.typeValues.length > 0) {
						completionItems = this.generateCompletionItemsFromTypeValues(UIProperty.typeValues);
					} else {
						const UIEvent = this.getUIEventRecursively(UIClass, attributeName);
						if (UIEvent) {
							const methods = XMLParser.getMethodsOfTheCurrentViewsController()
							.map(classMethod =>
								({
									text: classMethod.name,
									description: classMethod.description
								})
							);
							completionItems = this.generateCompletionItemsFromTypeValues(methods);
						}
					}
				}
			}
		}

		completionItems = this.removeDuplicateCompletionItems(completionItems);
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

	private getUIEventRecursively(UIClass: AbstractUIClass, eventName: string): UIEvent | undefined {
		let event: UIEvent | undefined;
		event = UIClass.events.find(event => event.name === eventName);
		if (!event && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			event = this.getUIEventRecursively(parentClass, eventName);
		}

		return event;
	}

	private generateCompletionItemsFromTypeValues(typeValues: TypeValue[]) {
		return this.removeDuplicateCompletionItems(typeValues.map(typeValue => {
			const completionItem =  new vscode.CompletionItem(typeValue.text, vscode.CompletionItemKind.Keyword);
			completionItem.detail = typeValue.text;
			completionItem.documentation = typeValue.description;
			return completionItem;
		}));
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

	private getEventCompletionItemsFromClass(UIClass: AbstractUIClass, eventValues: string[] = []) {
		let completionItems:vscode.CompletionItem[] = [];

		completionItems = UIClass.events.map(event => {
			const completionItem:vscode.CompletionItem = new vscode.CompletionItem(event.name);
			completionItem.kind = vscode.CompletionItemKind.Event;
			const insertTextValues = eventValues.length > 0 ? `|${eventValues.join(",")}|` : "";
			completionItem.insertText =  new vscode.SnippetString(`${event.name}="\${1${insertTextValues}}"$0`);
			completionItem.detail = event.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForEventsApi(UIClass, event.name);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${event.description}`);

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getEventCompletionItemsFromClass(parentClass, eventValues));
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