import * as vscode from "vscode";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { AbstractUIClass, ITypeValue, IUIProperty, IUIEvent, IUIAggregation } from "../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { URLBuilder } from "../../../../utils/URLBuilder";
import { XMLParser, PositionType } from "../../../../utils/XMLParser";
import { ResourceModelData } from "../../../../UI5Classes/ResourceModelData";
import { FileReader, IXMLFile, XMLFileTransformer } from "../../../../utils/FileReader";
import { SAPNodeDAO } from "../../../../librarydata/SAPNodeDAO";
import { StandardXMLCompletionItemFactory } from "./StandardXMLCompletionItemFactory";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import LineColumn = require("line-column");
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class XMLDynamicCompletionItemFactory implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const XMLFile = document && XMLFileTransformer.transformFromVSCodeDocument(document);

		if (XMLFile) {
			const currentPositionOffset = document.offsetAt(position);
			const positionType = XMLParser.getPositionType(XMLFile, currentPositionOffset);

			if (positionType === PositionType.InTheTagAttributes) {
				completionItems = this._getAttributeCompletionItems();

			} else if (positionType === PositionType.InTheString) {
				completionItems = this._getAttributeValuesCompletionItems();

			} else if (positionType === PositionType.InTheClassName) {

				completionItems = this._getTagCompletionItems();
			} else if (positionType === PositionType.InBodyOfTheClass) {

				completionItems = this._getCompletionItemsFromClassBody();

			}

			completionItems = this._removeDuplicateCompletionItems(completionItems);
			const range = this._generateRangeForReplacement(positionType, XMLFile, document, position);
			if (range) {
				completionItems.forEach(completionItem => {
					completionItem.range = range;
				});
			}
		}

		//copy(JSON.stringify(completionItems.map(item => item.insertText?.value || item.insertText || item.label)))
		return completionItems;
	}

	private _generateRangeForReplacement(positionType: PositionType, XMLFile: IXMLFile, document: vscode.TextDocument, position: vscode.Position) {
		let range = document.getWordRangeAtPosition(position);
		const positionOffset = document.offsetAt(position);
		if (positionType === PositionType.InTheString) {
			const tagPosition = XMLParser.getTagBeginEndPosition(XMLFile, positionOffset);
			const tag = XMLParser.getTagInPosition(XMLFile, positionOffset);
			const attributes = XMLParser.getAttributesOfTheTag(tag);
			const attribute = attributes?.find(attribute => {
				const index = tag.text.indexOf(attribute);
				const offset = tag.positionBegin + index;
				return positionOffset > offset && positionOffset < offset + attribute.length;
			});
			if (attribute) {
				const indexOfAttribute = tag.text.indexOf(attribute);
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				if (attributeValue) {
					const indexOfValue = attribute.indexOf(attributeValue);
					const lineColumnBegin = LineColumn(XMLFile.content).fromIndex(tagPosition.positionBegin + indexOfAttribute + indexOfValue);
					const lineColumnEnd = LineColumn(XMLFile.content).fromIndex(tagPosition.positionBegin + indexOfAttribute + indexOfValue + attributeValue.length);
					if (lineColumnBegin && lineColumnEnd && lineColumnBegin.line === lineColumnEnd.line) {
						range = new vscode.Range(lineColumnBegin.line - 1, lineColumnBegin.col - 1, lineColumnEnd.line - 1, lineColumnEnd.col - 1);
					}
				}
			}
		}

		return range;
	}

	private _getAllFileSpecificCompletionItems(addPrefix = true) {
		let completionItems: CustomCompletionItem[] = [];
		const textEditor = vscode.window.activeTextEditor;

		if (textEditor) {
			const document = textEditor.document;
			const XMLText = document.getText();
			completionItems = this._convertToFileSpecificCompletionItems(StandardXMLCompletionItemFactory.XMLStandardLibCompletionItems, XMLText, addPrefix);
		}

		return completionItems;
	}


	private _getAttributeValuesCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const document = vscode.window.activeTextEditor?.document;
		const XMLFile = document && XMLFileTransformer.transformFromVSCodeDocument(document);
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (document && XMLFile && currentPositionOffset) {
			const positionBeforeString = XMLParser.getPositionBeforeStringBegining(XMLFile.content, currentPositionOffset);

			const className = XMLParser.getClassNameInPosition(XMLFile, positionBeforeString);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				const attributeName = XMLParser.getNearestAttribute(XMLFile.content, positionBeforeString);
				const UIProperty = this._getUIPropertyRecursively(UIClass, attributeName);
				if (UIProperty && UIProperty.typeValues.length > 0) {

					completionItems = this._generateCompletionItemsFromTypeValues(UIProperty.typeValues);
				} else if (UIProperty?.type === "string") {

					const currentComponentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
					if (currentComponentName && ResourceModelData.resourceModels[currentComponentName]) {
						const typeValues = ResourceModelData.resourceModels[currentComponentName];
						completionItems = this._generateCompletionItemsFromTypeValues(typeValues);
					}
				} else {

					const UIEvent = this._getUIEventRecursively(UIClass, attributeName);
					if (UIEvent) {
						let methods = XMLParser.getMethodsOfTheControl();
						if (methods.length === 0) {
							const className = FileReader.getResponsibleClassForXMLDocument(document);
							if (className) {
								methods = XMLParser.getMethodsOfTheControl(className);
							}
						}
						const mappedMethods = methods.map(classMethod => ({
							text: classMethod.name,
							description: classMethod.description
						}));

						completionItems = this._generateCompletionItemsFromTypeValues(mappedMethods);
					}
				}
			}
		}

		return completionItems;
	}

	private _getTagCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);
		const XMLFile = vscode.window.activeTextEditor?.document && XMLFileTransformer.transformFromVSCodeDocument(vscode.window.activeTextEditor?.document);

		if (XMLFile && currentPositionOffset) {
			try {
				const libName = XMLParser.getLibraryNameInPosition(XMLFile, currentPositionOffset);
				const currentTagText = XMLParser.getTagInPosition(XMLFile, currentPositionOffset).text;
				const isTagEmpty = !currentTagText[1].match(/[a-zA-Z]/);
				if (isTagEmpty) {
					const { positionBegin: currentTagPositionBegin } = XMLParser.getTagBeginEndPosition(XMLFile, currentPositionOffset - 1);
					completionItems = this._getParentTagCompletionItems(currentTagPositionBegin - 1);
					completionItems = this._convertToFileSpecificCompletionItems(completionItems, XMLFile.content);
				} else if (libName) {
					let tagPrefix = XMLParser.getTagPrefix(currentTagText);
					tagPrefix = tagPrefix ? `${tagPrefix}:` : "";
					const isThisClassFromAProject = !!FileReader.getManifestForClass(libName + ".");
					if (!isThisClassFromAProject) {
						completionItems = this._getStandardCompletionItemsFilteredByLibraryName(libName);
						completionItems = this._filterCompletionItemsByAggregationsType(completionItems);
					} else {
						completionItems = this._getCompletionItemsForCustomClasses(libName, tagPrefix);
					}
				}
			} catch (error) {
				if (error.name === "LibraryPathException") {
					completionItems = [];
				}
			}
		}

		return completionItems;
	}

	private _convertToFileSpecificCompletionItems(completionItems: CustomCompletionItem[], XMLText: string, addPrefix = true) {
		const nodeDAO = new SAPNodeDAO();
		return completionItems.reduce((accumulator: CustomCompletionItem[], completionItem: CustomCompletionItem) => {
			const node = nodeDAO.findNode(completionItem.className);
			if (node) {
				const tagPrefix = XMLParser.getPrefixForLibraryName(node.getLib(), XMLText);
				if (tagPrefix !== undefined) {
					let classPrefix = "";
					if (addPrefix) {
						classPrefix = tagPrefix.length > 0 ? `${tagPrefix}:` : tagPrefix;
					}
					const completionItem = this._getStandardCompletionItemWithPrefix(node, tagPrefix, classPrefix);
					accumulator.push(completionItem);
				}
			} else {
				//this happens when you have aggregation completion items
				accumulator.push(completionItem);
			}
			return accumulator;
		}, []);
	}

	private _getCompletionItemsForCustomClasses(libName: string, tagPrefix: string) {
		const xmlClassFactory = new StandardXMLCompletionItemFactory();
		const wsFolders = vscode.workspace.workspaceFolders || [];
		const classNames = wsFolders.reduce((accumulator: string[], wsFolder: vscode.WorkspaceFolder) => {
			const classNames = FileReader.getAllJSClassNamesFromProject(wsFolder);
			accumulator = accumulator.concat(classNames);

			return accumulator;
		}, []);

		const classNamesForLibName = classNames.filter(className => className.startsWith(libName));
		const UIClassesForLibName = classNamesForLibName.map(className => UIClassFactory.getUIClass(className));
		const UIClassesThatExtendsUIControl = UIClassesForLibName.filter(UIClass => UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Control"));
		const completionItems: CustomCompletionItem[] = UIClassesThatExtendsUIControl.map(UIClass => xmlClassFactory.generateXMLClassCompletionItemFromUIClass(UIClass, tagPrefix));

		return completionItems;
	}

	private _getStandardCompletionItemsFilteredByLibraryName(libName: string) {
		const standardCompletionItems = this._getAllFileSpecificCompletionItems(false);
		const completionItems = standardCompletionItems.filter(completionItem => completionItem.className.startsWith(libName));

		return completionItems;
	}

	private _getStandardCompletionItemWithPrefix(node: any, tagPrefix: string, classPrefix = "") {
		const XMLClassFactoryInstance = new StandardXMLCompletionItemFactory();
		const completionItem = XMLClassFactoryInstance.generateXMLClassCompletionItemFromSAPNode(node, tagPrefix, classPrefix);

		return completionItem;
	}

	private _filterCompletionItemsByAggregationsType(completionItems: CustomCompletionItem[]) {
		const XMLFile = vscode.window.activeTextEditor?.document && XMLFileTransformer.transformFromVSCodeDocument(vscode.window.activeTextEditor?.document);
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLFile && currentPositionOffset) {
			const { positionBegin: currentTagPositionBegin } = XMLParser.getTagBeginEndPosition(XMLFile, currentPositionOffset);
			completionItems = this._getParentTagCompletionItems(currentTagPositionBegin - 1, completionItems);
		}

		return completionItems;
	}

	private _getParentTagCompletionItems(currentPosition: number, completionItems: CustomCompletionItem[] = this._getAllFileSpecificCompletionItems()) {
		const XMLFile = vscode.window.activeTextEditor?.document && XMLFileTransformer.transformFromVSCodeDocument(vscode.window.activeTextEditor?.document);
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLFile && currentPositionOffset) {
			const parentTagInfo = XMLParser.getParentTagAtPosition(XMLFile, currentPosition);
			const parentTagName = XMLParser.getClassNameFromTag(parentTagInfo.text);
			const parentTagIsAClass = parentTagName[0] === parentTagName[0].toUpperCase();

			if (parentTagIsAClass) {
				const classTagPrefix = XMLParser.getTagPrefix(parentTagInfo.text);
				const className = XMLParser.getClassNameFromTag(parentTagInfo.text);
				const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLFile, classTagPrefix, parentTagInfo.positionEnd);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = UIClassFactory.getUIClass(classOfTheTag);
				const aggregations = this._getAllAggregationsRecursively(UIClass);
				const aggregationCompletionItems = this._generateAggregationCompletionItems(aggregations, classTagPrefix);
				//add completion items for default aggregation
				const defaultAggregation = aggregations.find(aggregation => aggregation.default);
				if (defaultAggregation) {
					const aggregationType = defaultAggregation.type;
					if (aggregationType) {
						const nodeDAO = new SAPNodeDAO();
						completionItems = aggregationCompletionItems.concat(completionItems.filter(completionItem => {
							return nodeDAO.isInstanceOf(aggregationType, completionItem.className);
						}));
					}
				} else {
					completionItems = aggregationCompletionItems;
				}
			} else {

				// previous tag is an aggregation
				const aggregationName = XMLParser.getClassNameFromTag(parentTagInfo.text);
				const classTagInfo = XMLParser.getParentTagAtPosition(XMLFile, parentTagInfo.positionBegin - 1);
				const classTagPrefix = XMLParser.getTagPrefix(classTagInfo.text);
				const className = XMLParser.getClassNameFromTag(classTagInfo.text);
				const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLFile, classTagPrefix, classTagInfo.positionEnd);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = UIClassFactory.getUIClass(classOfTheTag);
				const UIAggregation = this._getUIAggregationRecursively(UIClass, aggregationName);
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

	private _generateAggregationCompletionItems(aggregations: IUIAggregation[], classTagPrefix: string) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = aggregations.map(aggregation => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = this._generateInsertTextForAggregation(aggregation, classTagPrefix);
			completionItem.detail = aggregation.type || "";
			return completionItem;
		});

		return completionItems;
	}

	private _generateInsertTextForAggregation(aggregation: IUIAggregation, prefix: string) {
		if (prefix) {
			prefix = `${prefix}:`;
		}

		return new vscode.SnippetString(`${prefix}${aggregation.name}>\n\t$0\n</${prefix}${aggregation.name}>`);
	}

	private _cloneCompletionItem(completionItem: any): CustomCompletionItem {
		const clone: any = new CustomCompletionItem(completionItem.label, completionItem.kind);
		for (const attribute in completionItem) {
			clone[attribute] = completionItem[attribute];
		}
		return clone;
	}

	private _getCompletionItemsFromClassBody() {
		let completionItems: CustomCompletionItem[] = [];
		const XMLText = vscode.window.activeTextEditor?.document.getText();
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLText && currentPositionOffset) {
			completionItems = this._getParentTagCompletionItems(currentPositionOffset);
			completionItems = completionItems.map(completionItem => {
				completionItem = this._cloneCompletionItem(completionItem);
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

	private _getAttributeCompletionItems() {
		let completionItems: CustomCompletionItem[] = [];

		const XMLFile = vscode.window.activeTextEditor?.document && XMLFileTransformer.transformFromVSCodeDocument(vscode.window.activeTextEditor?.document);
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);

		if (XMLFile && currentPositionOffset) {
			const className = XMLParser.getClassNameInPosition(XMLFile, currentPositionOffset);
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				let controllerMethods = XMLParser.getMethodsOfTheControl().map(method => method.name);
				controllerMethods = [...new Set(controllerMethods)];
				completionItems = this._getPropertyCompletionItemsFromClass(UIClass);
				completionItems = completionItems.concat(this._getEventCompletionItemsFromClass(UIClass, controllerMethods));
				completionItems = completionItems.concat(this._getAggregationCompletionItemsFromClass(UIClass));
				completionItems = completionItems.concat(this._getAssociationCompletionItemsFromClass(UIClass));
			}
		}

		return completionItems;
	}

	private _getUIAggregationRecursively(UIClass: AbstractUIClass, aggregationName: string): IUIAggregation | undefined {
		let aggregation: IUIAggregation | undefined;
		aggregation = UIClass.aggregations.find(aggregation => aggregation.name === aggregationName);
		if (!aggregation && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregation = this._getUIAggregationRecursively(parentClass, aggregationName);
		}

		return aggregation;
	}

	private _getAllAggregationsRecursively(UIClass: AbstractUIClass): IUIAggregation[] {
		let aggregations = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregations = aggregations.concat(this._getAllAggregationsRecursively(parentClass));
		}

		return aggregations;
	}

	private _getUIPropertyRecursively(UIClass: AbstractUIClass, propertyName: string): IUIProperty | undefined {
		let property: IUIProperty | undefined;
		property = UIClass.properties.find(property => property.name === propertyName);
		if (!property && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			property = this._getUIPropertyRecursively(parentClass, propertyName);
		}

		return property;
	}

	private _getUIEventRecursively(UIClass: AbstractUIClass, eventName: string): IUIEvent | undefined {
		let event: IUIEvent | undefined;
		event = UIClass.events.find(event => event.name === eventName);
		if (!event && UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			event = this._getUIEventRecursively(parentClass, eventName);
		}

		return event;
	}

	private _generateCompletionItemsFromTypeValues(typeValues: ITypeValue[]) {
		return this._removeDuplicateCompletionItems(typeValues.map(typeValue => {
			const completionItem = new CustomCompletionItem(typeValue.text, vscode.CompletionItemKind.Keyword);
			completionItem.detail = typeValue.text;
			completionItem.documentation = typeValue.description;
			return completionItem;
		}));
	}


	private _getPropertyCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.properties.map(property => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(property.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			// const typeValueValues = property.typeValues.map(typeValue => typeValue.text);
			// const insertTextValues = typeValueValues.length > 0 ? `|${typeValueValues.join(",")}|` : "";
			completionItem.insertText = new vscode.SnippetString(`${property.name}`);
			completionItem.detail = `${property.name}: ${property.type}`;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForPropertiesApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${property.description}`);
			completionItem.sortText = "1";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getPropertyCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _getEventCompletionItemsFromClass(UIClass: AbstractUIClass, eventValues: string[] = []) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.events.map(event => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(event.name);
			completionItem.kind = vscode.CompletionItemKind.Event;
			// const insertTextValues = eventValues.length > 0 ? `|${eventValues.join(",")}|` : "";
			completionItem.insertText = new vscode.SnippetString(`${event.name}`);
			completionItem.detail = event.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForEventsApi(UIClass, event.name);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${event.description}`);
			completionItem.sortText = "2";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getEventCompletionItemsFromClass(parentClass, eventValues));
		}

		return completionItems;
	}

	private _getAggregationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.aggregations.map(aggregation => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${aggregation.name}`);
			completionItem.detail = aggregation.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAggregationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${aggregation.description}\n${aggregation.type}`);
			completionItem.sortText = "3";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getAggregationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _getAssociationCompletionItemsFromClass(UIClass: AbstractUIClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.associations.map(association => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(association.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${association.name}`);
			completionItem.detail = association.name;
			const UI5ApiUri = URLBuilder.getInstance().getMarkupUrlForAssociationApi(UIClass);
			completionItem.documentation = new vscode.MarkdownString(`${UI5ApiUri}\n${association.description}`);
			completionItem.sortText = "4";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getAssociationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _removeDuplicateCompletionItems(completionItems: CustomCompletionItem[]) {
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