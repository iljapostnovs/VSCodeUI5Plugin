import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { AbstractUIClass, TypeValue, UIProperty, UIEvent, UIAggregation } from "../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { URLBuilder } from "../../../utils/URLBuilder";
import { XMLParser, PositionType } from "../../../utils/XMLParser";
import { ResourceModelData } from "../../../UI5Classes/ResourceModelData";
import { FileReader } from "../../../utils/FileReader";
import { CompletionItemFactory } from "../../CompletionItemFactory";
import { SAPNodeDAO } from "../../../librarydata/SAPNodeDAO";
import { XMLClassFactory } from "./XMLClassFactory";
import { CustomCompletionItem } from "../../CustomCompletionItem";

export class XMLDynamicFactory {
	public generateXMLDynamicCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const textEditor = vscode.window.activeTextEditor;

		if (textEditor) {
			const document = textEditor.document;
			const currentPositionOffset = document.offsetAt(textEditor.selection.start);
			const XMLText = document.getText();
			const positionType = XMLParser.getPositionType(XMLText, currentPositionOffset);

			if (positionType === PositionType.InTheTagAttributes) {
				completionItems = this.getAttributeCompletionItems();

			} else if (positionType === PositionType.InTheString) {
				completionItems = this.getAttributeValuesCompletionItems();

			} else if (positionType === PositionType.InTheClassName) {

				completionItems = this.getTagCompletionItems();
			} else if (positionType === PositionType.InBodyOfTheClass) {

				completionItems = this.getCompletionItemsFromClassBody();

			}

			completionItems = this.removeDuplicateCompletionItems(completionItems);

			if (completionItems.length === 0) {
				completionItems = this.getAllFileSpecificCompletionItems();
			}
		}

		return completionItems;
	}

	private getAllFileSpecificCompletionItems(addPrefix: boolean = true) {
		let completionItems: CustomCompletionItem[] = [];
		const textEditor = vscode.window.activeTextEditor;

		if (textEditor) {
			const document = textEditor.document;
			const XMLText = document.getText();
			completionItems = this.convertToFileSpecificCompletionItems(CompletionItemFactory.XMLStandardLibCompletionItems, XMLText, addPrefix);
		}

		return completionItems;
	}


	private getAttributeValuesCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			const positionBeforeString = XMLParser.getPositionBeforeStringBegining(XMLText, currentPositionOffset);

			const className = XMLParser.getClassNameInPosition(XMLText, positionBeforeString);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				const attributeName = XMLParser.getNearestAttribute(XMLText, positionBeforeString);
				const UIProperty = this.getUIPropertyRecursively(UIClass, attributeName);
				if (UIProperty && UIProperty.typeValues.length > 0) {

					completionItems = this.generateCompletionItemsFromTypeValues(UIProperty.typeValues);
				} else if (UIProperty?.type === "string") {

					const currentComponentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
					if (currentComponentName && ResourceModelData.resourceModels[currentComponentName]) {
						const typeValues = ResourceModelData.resourceModels[currentComponentName];
						completionItems = this.generateCompletionItemsFromTypeValues(typeValues);
					}
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

		return completionItems;
	}

	private getTagCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			const libName = XMLParser.getLibraryNameInPosition(XMLText, currentPositionOffset);
			const currentTagText = XMLParser.getTagInPosition(XMLText, currentPositionOffset);
			const isTagEmpty = !currentTagText[1].match(/[a-zA-Z]/);
			if (isTagEmpty) {
				const { positionBegin: currentTagPositionBegin } = XMLParser.getTagBeginEndPosition(XMLText, currentPositionOffset - 1);
				completionItems = this.getParentTagCompletionItems(currentTagPositionBegin - 1);
				completionItems = this.convertToFileSpecificCompletionItems(completionItems, XMLText);
			} else if (libName) {
				let tagPrefix = XMLParser.getTagPrefix(currentTagText);
				tagPrefix = tagPrefix ? `${tagPrefix}:` : "";
				if (libName.startsWith("sap.")) {
					completionItems = this.getStandardCompletionItemsFilteredByLibraryName(libName);
					completionItems = this.filterCompletionItemsByAggregationsType(completionItems);
				} else {
					completionItems = this.getCompletionItemsForCustomClasses(libName, tagPrefix);
				}
			}
		}

		return completionItems;
	}

	private convertToFileSpecificCompletionItems(completionItems: CustomCompletionItem[], XMLText: string, addPrefix: boolean = true) {
		const nodeDAO = new SAPNodeDAO();
		return  completionItems.reduce((accumulator: CustomCompletionItem[], completionItem: CustomCompletionItem) => {
			const node = nodeDAO.findNode(completionItem.className);
			if (node) {
				const tagPrefix = XMLParser.getPrefixForLibraryName(node.getLib(), XMLText);
				if (tagPrefix !== undefined) {
					let classPrefix = "";
					if (addPrefix) {
						classPrefix = tagPrefix.length > 0 ? `${tagPrefix}:` : tagPrefix;
					}
					const completionItem = this.getStandardCompletionItemWithPrefix(node, tagPrefix, classPrefix);
					accumulator.push(completionItem);
				}
			} else {
				//this happens when you have aggregation completion items
				accumulator.push(completionItem);
			}
			return accumulator;
		}, []);
	}

	private getCompletionItemsForCustomClasses(libName: string, tagPrefix: string) {
		const xmlClassFactory = new XMLClassFactory();
		const wsFolders = vscode.workspace.workspaceFolders || [];
		const classNames = wsFolders.reduce((accumulator: string[], wsFolder: vscode.WorkspaceFolder) => {
			const classNames = FileReader.getAllJSClassNamesFromProject(wsFolder);
			accumulator= accumulator.concat(classNames);

			return accumulator;
		}, []);

		const classNamesForLibName = classNames.filter(className => className.startsWith(libName));
		const UIClassesForLibName = classNamesForLibName.map(className => UIClassFactory.getUIClass(className));
		const UIClassesThatExtendsUIControl = UIClassesForLibName.filter(UIClass => UIClassFactory.isClassAExtendedByClassB(UIClass.className, "sap.ui.core.Control"));
		const completionItems: CustomCompletionItem[] = UIClassesThatExtendsUIControl.map(UIClass => xmlClassFactory.generateXMLClassCompletionItemFromUIClass(UIClass, tagPrefix));

		return completionItems;
	}

	private getStandardCompletionItemsFilteredByLibraryName(libName: string) {
		const standardCompletionItems = this.getAllFileSpecificCompletionItems(false);
		const completionItems = standardCompletionItems.filter(completionItem => completionItem.className.startsWith(libName));

		return completionItems;
	}

	private getStandardCompletionItemWithPrefix(node: any, tagPrefix: string, classPrefix: string = "") {
		let completionItem: CustomCompletionItem | undefined;
		const XMLClassFactoryInstance = new XMLClassFactory();

		completionItem = XMLClassFactoryInstance.generateXMLClassCompletionItemFromSAPNode(node, tagPrefix, classPrefix);

		return completionItem;
	}

	private filterCompletionItemsByAggregationsType(completionItems: CustomCompletionItem[]) {
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			const { positionBegin: currentTagPositionBegin } = XMLParser.getTagBeginEndPosition(XMLText, currentPositionOffset);
			completionItems = this.getParentTagCompletionItems(currentTagPositionBegin - 1, completionItems);
		}

		return completionItems;
	}

	private getParentTagCompletionItems(currentPosition: number, completionItems: CustomCompletionItem[] = this.getAllFileSpecificCompletionItems()) {
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			const parentTagInfo = XMLParser.getParentTagAtPosition(XMLText, currentPosition);
			const parentTagName = XMLParser.getClassNameFromTag(parentTagInfo.tag);
			const parentTagIsAClass = parentTagName[0] === parentTagName[0].toUpperCase();

			if (parentTagIsAClass) {
				const classTagPrefix = XMLParser.getTagPrefix(parentTagInfo.tag);
				const className = XMLParser.getClassNameFromTag(parentTagInfo.tag);
				const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLText, classTagPrefix, parentTagInfo.positionEnd);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = UIClassFactory.getUIClass(classOfTheTag);
				const aggregations = this.getAllAggregationsRecursively(UIClass);
				completionItems = this.generateAggregationCompletionItems(aggregations, classTagPrefix);
			} else {

				// previous tag is an aggregation
				const aggregationName = XMLParser.getClassNameFromTag(parentTagInfo.tag);
				const classTagInfo = XMLParser.getParentTagAtPosition(XMLText, parentTagInfo.positionBegin - 1);
				const classTagPrefix = XMLParser.getTagPrefix(classTagInfo.tag);
				const className = XMLParser.getClassNameFromTag(classTagInfo.tag);
				const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLText, classTagPrefix, classTagInfo.positionEnd);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = UIClassFactory.getUIClass(classOfTheTag);
				const UIAggregation = this.getUIAggregationRecursively(UIClass, aggregationName);
				if (UIAggregation?.type) {
					const aggregationType = UIAggregation.type;
					const nodeDAO = new SAPNodeDAO();
					completionItems = completionItems.filter(completionItem => {
						return nodeDAO.isInstanceOf(aggregationType, completionItem.className);
					});
				}
			}
		}

		return completionItems;
	}

	private generateAggregationCompletionItems(aggregations: UIAggregation[], classTagPrefix: string) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = aggregations.map(aggregation => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = this.generateInsertTextForAggregation(aggregation, classTagPrefix);
			completionItem.detail = aggregation.type || "";
			return completionItem;
		});
		return completionItems;
	}

	private generateInsertTextForAggregation(aggregation: UIAggregation, prefix: string) {
		if (prefix) {
			prefix = `${prefix}:`;
		}

		return new vscode.SnippetString(`${prefix}${aggregation.name}>\n\t$0\n</${prefix}${aggregation.name}>`);
	}

	private cloneCompletionItem(completionItem: any): CustomCompletionItem {
		const clone: any = new CustomCompletionItem(completionItem.label, completionItem.kind);
		for (const attribute in completionItem) {
			clone[attribute] = completionItem[attribute];
		}
		return clone;
	}

	private getCompletionItemsFromClassBody() {
		let completionItems: CustomCompletionItem[] = [];
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			completionItems = this.getParentTagCompletionItems(currentPositionOffset);
			completionItems = completionItems.map(completionItem => {
				completionItem = this.cloneCompletionItem(completionItem);
				if (completionItem.insertText instanceof vscode.SnippetString) {
					completionItem.insertText.value = "<" + completionItem.insertText.value;
				} else {
					completionItem.insertText = "<" + completionItem.insertText;
				}

				return completionItem;
			});
		}

		return completionItems;
	}

	private getAttributeCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];

		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
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
		}

		return completionItems;
	}

	private getUIAggregationRecursively(UIClass: AbstractUIClass, aggregationName: string): UIAggregation | undefined {
		let aggregation: UIAggregation | undefined;
		aggregation = UIClass.aggregations.find(aggregation => aggregation.name === aggregationName);
		if (!aggregation && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregation = this.getUIAggregationRecursively(parentClass, aggregationName);
		}

		return aggregation;
	}

	private getAllAggregationsRecursively(UIClass: AbstractUIClass): UIAggregation[] {
		let aggregations = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregations = aggregations.concat(this.getAllAggregationsRecursively(parentClass));
		}

		return aggregations;
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
			const completionItem =  new CustomCompletionItem(typeValue.text, vscode.CompletionItemKind.Keyword);
			completionItem.detail = typeValue.text;
			completionItem.documentation = typeValue.description;
			return completionItem;
		}));
	}


	private getPropertyCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:CustomCompletionItem[] = [];

		completionItems = UIClass.properties.map(property => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(property.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			const typeValueValues = property.typeValues.map(typeValue => typeValue.text);
			const insertTextValues = typeValueValues.length > 0 ? `|${typeValueValues.join(",")}|` : "";
			completionItem.insertText =  new vscode.SnippetString(`${property.name}="\${1${insertTextValues}}"$0`);
			completionItem.detail = `${property.name}: ${property.type}`;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForPropertiesApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${property.description}`);
			completionItem.sortText = "1";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getPropertyCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private getEventCompletionItemsFromClass(UIClass: AbstractUIClass, eventValues: string[] = []) {
		let completionItems:CustomCompletionItem[] = [];

		completionItems = UIClass.events.map(event => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(event.name);
			completionItem.kind = vscode.CompletionItemKind.Event;
			const insertTextValues = eventValues.length > 0 ? `|${eventValues.join(",")}|` : "";
			completionItem.insertText =  new vscode.SnippetString(`${event.name}="\${1${insertTextValues}}"$0`);
			completionItem.detail = event.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForEventsApi(UIClass, event.name);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${event.description}`);
			completionItem.sortText = "2";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getEventCompletionItemsFromClass(parentClass, eventValues));
		}

		return completionItems;
	}

	private getAggregationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:CustomCompletionItem[] = [];

		completionItems = UIClass.aggregations.map(aggregation => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${aggregation.name}="\${1}"$0`);
			completionItem.detail = aggregation.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAggregationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${aggregation.description}\n${aggregation.type}`);
			completionItem.sortText = "3";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getAggregationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private getAssociationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems:CustomCompletionItem[] = [];

		completionItems = UIClass.associations.map(association => {
			const completionItem:CustomCompletionItem = new CustomCompletionItem(association.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${association.name}="\${1}"$0`);
			completionItem.detail = association.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAssociationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${association.description}`);
			completionItem.sortText = "4";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this.getAssociationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private removeDuplicateCompletionItems(completionItems: CustomCompletionItem[]) {
		completionItems = completionItems.reduce((accumulator: CustomCompletionItem[], completionItem: CustomCompletionItem) => {
			const methodInAccumulator = accumulator.find(accumulatedCompletionItem =>
				accumulatedCompletionItem.label === completionItem.label
			);
			if (!methodInAccumulator) {
				accumulator.push(completionItem);
			}
			return accumulator;
		}, []);

		return completionItems;
	}
}