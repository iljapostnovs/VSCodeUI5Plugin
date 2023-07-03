/* eslint-disable @typescript-eslint/quotes */
import { ParserPool } from "ui5plugin-parser";
import {
	AbstractJSClass,
	IUIAggregation,
	IUIEvent,
	IUIProperty
} from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { ITag, PositionType } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import HTMLMarkdown from "../../../../utils/HTMLMarkdown";
import { VSCodeFileReader } from "../../../../utils/VSCodeFileReader";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import GenerateIDCommand from "../../../../vscommands/generateids/GenerateIDCommand";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";
import { StandardXMLCompletionItemFactory } from "./StandardXMLCompletionItemFactory";

interface ITypeValue {
	text: string;
	description: string | HTMLMarkdown;
}
export class XMLDynamicCompletionItemFactory extends ParserBearer implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const XMLFile = document && this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));

		if (XMLFile && XMLFile.XMLParserData?.areAllStringsClosed) {
			const currentPositionOffset = document.offsetAt(position);
			const positionType = this._parser.xmlParser.getPositionType(XMLFile, currentPositionOffset);

			if (positionType === PositionType.InNewAttribute || positionType === PositionType.InExistingAttribute) {
				completionItems = this._getAttributeCompletionItems(document, position);

				if (positionType === PositionType.InNewAttribute) {
					completionItems.forEach(item => {
						if (item.insertText instanceof vscode.SnippetString && item.label !== "id") {
							item.insertText.appendText('="');
							item.insertText.appendTabstop(0);
							item.insertText.appendText('"');
						}
					});
				}
			} else if (positionType === PositionType.InTheString) {
				completionItems = this._getAttributeValuesCompletionItems(document, position);
			} else if (positionType === PositionType.InTheClassName) {
				completionItems = this._getTagCompletionItems(document, position);
			} else if (positionType === PositionType.InBodyOfTheClass) {
				completionItems = this._getCompletionItemsFromClassBody(document, position);
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

	private _generateRangeForReplacement(
		positionType: PositionType,
		XMLFile: IXMLFile,
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let range = document.getWordRangeAtPosition(position);
		const positionOffset = document.offsetAt(position);
		if (positionType === PositionType.InTheString) {
			const tagPosition = this._parser.xmlParser.getTagBeginEndPosition(XMLFile, positionOffset);
			const tag = this._parser.xmlParser.getTagInPosition(XMLFile, positionOffset);
			const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
			const attribute = attributes?.find(attribute => {
				const index = tag.text.indexOf(attribute);
				const offset = tag.positionBegin + index;
				return positionOffset > offset && positionOffset < offset + attribute.length;
			});
			if (attribute) {
				const indexOfAttribute = tag.text.indexOf(attribute);
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				if (attributeValue) {
					const indexOfValue = attribute.indexOf(attributeValue);
					const positionBegin = tagPosition.positionBegin + indexOfAttribute + indexOfValue;
					const positionEnd = positionBegin + attributeValue.length;
					range = RangeAdapter.offsetsToVSCodeRange(XMLFile.content, positionBegin, positionEnd - 1);
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
			completionItems = this._convertToFileSpecificCompletionItems(
				this._parser.getCustomData<StandardXMLCompletionItemFactory>("StandardXMLCompletionItemFactory")
					?.XMLStandardLibCompletionItems ?? [],
				XMLText,
				addPrefix
			);
		}

		return completionItems;
	}

	private _getAttributeValuesCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		const currentPositionOffset = document.offsetAt(position);

		if (document && XMLFile && currentPositionOffset) {
			const positionBeforeString = this._parser.xmlParser.getPositionBeforeStringBegining(
				XMLFile.content,
				currentPositionOffset
			);

			const className = this._parser.xmlParser.getClassNameInPosition(XMLFile, positionBeforeString);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				const attributeName = this._parser.xmlParser.getNearestAttribute(XMLFile.content, positionBeforeString);
				const UIProperty = this._getUIPropertyRecursively(UIClass, attributeName);

				if (className === "sap.ui.core.Fragment" && attributeName === "fragmentName") {
					const fragments = ParserPool.getAllFragments();
					const fragmentData: ITypeValue[] = fragments.map(fragment => {
						const description = new HTMLMarkdown()
							.appendMarkdown(`Name: \`\`\`${fragment.name}\`\`\`<br/>`)
							.appendMarkdown(`Path: \`\`\`${fragment.fsPath}\`\`\``)
							.appendCodeblock(fragment.content, "xml");
						return {
							text: fragment.name,
							description: description
						};
					});

					completionItems = this._generateCompletionItemsFromTypeValues(fragmentData);
				} else if (UIProperty && UIProperty.typeValues.length > 0) {
					completionItems = this._generateCompletionItemsFromTypeValues(UIProperty.typeValues);
				} else if (UIProperty?.type === "string") {
					const currentComponentName = new VSCodeFileReader(
						this._parser
					).getComponentNameOfAppInCurrentWorkspaceFolder();
					if (currentComponentName && this._parser.resourceModelData.resourceModels[currentComponentName]) {
						const typeValues = this._parser.resourceModelData.resourceModels[currentComponentName];
						completionItems = this._generateCompletionItemsFromTypeValues(typeValues);
					}
				} else {
					const UIEvent = this._getUIEventRecursively(UIClass, attributeName);
					if (UIEvent) {
						let methods = this._parser.xmlParser.getMethodsOfTheControl(
							new VSCodeFileReader(this._parser).getControllerNameOfTheCurrentDocument() || ""
						);
						if (methods.length === 0) {
							const className = this._parser.fileReader.getResponsibleClassForXMLDocument(
								new TextDocumentAdapter(document)
							);
							if (className) {
								methods = this._parser.xmlParser.getMethodsOfTheControl(className);
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

	private _getTagCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const currentPositionOffset = document.offsetAt(position);
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));

		if (XMLFile && currentPositionOffset) {
			try {
				const libName = this._parser.xmlParser.getLibraryNameInPosition(XMLFile, currentPositionOffset);
				const currentTagText = this._parser.xmlParser.getTagInPosition(XMLFile, currentPositionOffset).text;
				const isTagEmpty = !currentTagText[1].match(/[a-zA-Z]/);
				if (isTagEmpty) {
					const { positionBegin: currentTagPositionBegin } = this._parser.xmlParser.getTagBeginEndPosition(
						XMLFile,
						currentPositionOffset - 1
					);
					completionItems = this._getParentTagCompletionItems(
						document,
						position,
						currentTagPositionBegin - 1
					);
					completionItems = this._convertToFileSpecificCompletionItems(completionItems, XMLFile.content);
				} else if (libName) {
					let tagPrefix = this._parser.xmlParser.getTagPrefix(currentTagText);
					tagPrefix = tagPrefix ? `${tagPrefix}:` : "";
					const isThisClassFromAProject = !!ParserPool.getManifestForClass(libName + ".");
					if (!isThisClassFromAProject) {
						completionItems = this._getStandardCompletionItemsFilteredByLibraryName(libName);
						completionItems = this._filterCompletionItemsByAggregationsType(
							document,
							position,
							completionItems
						);
					} else {
						completionItems = this._getCompletionItemsForCustomClasses(libName, tagPrefix);
					}
				}
			} catch (error) {
				if ((<any>error).name === "LibraryPathException") {
					completionItems = [];
				}
			}
		}

		return completionItems;
	}

	private _convertToFileSpecificCompletionItems(
		completionItems: CustomCompletionItem[],
		XMLText: string,
		addPrefix = true
	) {
		const nodeDAO = this._parser.nodeDAO;
		return completionItems.reduce((accumulator: CustomCompletionItem[], completionItem: CustomCompletionItem) => {
			const node = nodeDAO.findNode(completionItem.className);
			if (node) {
				const libName = node.getName().replace(`.${node.getDisplayName()}`, "");
				const tagPrefix = this._parser.xmlParser.getPrefixForLibraryName(libName, XMLText);
				if (tagPrefix !== undefined) {
					let classPrefix = "";
					if (addPrefix) {
						classPrefix = tagPrefix.length > 0 ? `${tagPrefix}:` : tagPrefix;
					}
					const completionItem = this._getStandardCompletionItemWithPrefix(node, tagPrefix, classPrefix);
					if (completionItem) {
						accumulator.push(completionItem);
					}
				}
			} else {
				//this happens when you have aggregation completion items
				accumulator.push(completionItem);
			}
			return accumulator;
		}, []);
	}

	private _getCompletionItemsForCustomClasses(libName: string, tagPrefix: string) {
		const xmlClassFactory = this._parser.getCustomData<StandardXMLCompletionItemFactory>(
			"StandardXMLCompletionItemFactory"
		);
		const wsFolders = vscode.workspace.workspaceFolders || [];
		const classNames = wsFolders.reduce((accumulator: string[], wsFolder) => {
			const classNames = this._parser.fileReader.getAllJSClassNamesFromProject({ fsPath: wsFolder.uri.fsPath });
			accumulator = accumulator.concat(classNames);

			return accumulator;
		}, []);

		const classNamesForLibName = classNames.filter(className => className.startsWith(libName));
		const UIClassesForLibName = classNamesForLibName.map(className =>
			this._parser.classFactory.getUIClass(className)
		);
		const UIClassesThatExtendsUIControl = UIClassesForLibName.filter(UIClass =>
			this._parser.classFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Control")
		);
		const completionItems: CustomCompletionItem[] = UIClassesThatExtendsUIControl.map(UIClass =>
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			xmlClassFactory!.generateXMLClassCompletionItemFromUIClass(UIClass, tagPrefix)
		);

		return completionItems;
	}

	private _getStandardCompletionItemsFilteredByLibraryName(libName: string) {
		const standardCompletionItems = this._getAllFileSpecificCompletionItems(false);
		const completionItems = standardCompletionItems.filter(completionItem =>
			completionItem.className.startsWith(libName)
		);

		return completionItems;
	}

	private _getStandardCompletionItemWithPrefix(node: any, tagPrefix: string, classPrefix = "") {
		const XMLClassFactoryInstance = this._parser.getCustomData<StandardXMLCompletionItemFactory>(
			"StandardXMLCompletionItemFactory"
		);
		const completionItem = XMLClassFactoryInstance?.generateXMLClassCompletionItemFromSAPNode(
			node,
			tagPrefix,
			classPrefix
		);

		return completionItem;
	}

	private _filterCompletionItemsByAggregationsType(
		document: vscode.TextDocument,
		position: vscode.Position,
		completionItems: CustomCompletionItem[]
	) {
		const XMLFile =
			vscode.window.activeTextEditor?.document &&
			this._parser.textDocumentTransformer.toXMLFile(
				new TextDocumentAdapter(vscode.window.activeTextEditor.document)
			);
		const currentPositionOffset = vscode.window.activeTextEditor?.document.offsetAt(
			vscode.window.activeTextEditor?.selection.start
		);

		if (XMLFile && currentPositionOffset) {
			const { positionBegin: currentTagPositionBegin } = this._parser.xmlParser.getTagBeginEndPosition(
				XMLFile,
				currentPositionOffset
			);
			completionItems = this._getParentTagCompletionItems(
				document,
				position,
				currentTagPositionBegin - 1,
				completionItems
			);
		}

		return completionItems;
	}

	private _getParentTagCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		currentPosition: number,
		completionItems: CustomCompletionItem[] = this._getAllFileSpecificCompletionItems()
	) {
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		const currentPositionOffset = document.offsetAt(position);

		if (XMLFile && currentPositionOffset) {
			const parentTagInfo = this._parser.xmlParser.getParentTagAtPosition(XMLFile, currentPosition);
			const parentTagName = this._parser.xmlParser.getClassNameFromTag(parentTagInfo.text);
			const parentTagIsAClass = parentTagName[0] === parentTagName[0].toUpperCase();

			if (parentTagIsAClass) {
				const classTagPrefix = this._parser.xmlParser.getTagPrefix(parentTagInfo.text);
				const className = this._parser.xmlParser.getClassNameFromTag(parentTagInfo.text);
				const libraryPath = this._parser.xmlParser.getLibraryPathFromTagPrefix(
					XMLFile,
					classTagPrefix,
					parentTagInfo.positionEnd
				);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = this._parser.classFactory.getUIClass(classOfTheTag);
				const aggregations = this._getAllAggregationsRecursively(UIClass);
				const aggregationCompletionItems = this._generateAggregationCompletionItems(
					aggregations,
					classTagPrefix
				);
				//add completion items for default aggregation
				const defaultAggregation = aggregations.find(aggregation => aggregation.default);
				if (defaultAggregation) {
					const aggregationType = defaultAggregation.type;
					if (aggregationType) {
						const nodeDAO = this._parser.nodeDAO;
						completionItems = aggregationCompletionItems.concat(
							completionItems.filter(completionItem => {
								return nodeDAO.isInstanceOf(aggregationType, completionItem.className);
							})
						);
					}
				} else if (
					(classOfTheTag === "sap.ui.core.FragmentDefinition" || classOfTheTag === "sap.ui.core.mvc.View") &&
					libraryPath
				) {
					const nodeDAO = this._parser.nodeDAO;
					completionItems = completionItems.filter(completionItem => {
						return nodeDAO.isInstanceOf("sap.ui.core.Control", completionItem.className);
					});
				} else {
					completionItems = aggregationCompletionItems;
				}
			} else {
				// previous tag is an aggregation
				const aggregationName = this._parser.xmlParser.getClassNameFromTag(parentTagInfo.text);
				const classTagInfo = this._parser.xmlParser.getParentTagAtPosition(
					XMLFile,
					parentTagInfo.positionBegin - 1
				);
				const classTagPrefix = this._parser.xmlParser.getTagPrefix(classTagInfo.text);
				const className = this._parser.xmlParser.getClassNameFromTag(classTagInfo.text);
				const libraryPath = this._parser.xmlParser.getLibraryPathFromTagPrefix(
					XMLFile,
					classTagPrefix,
					classTagInfo.positionEnd
				);
				const classOfTheTag = [libraryPath, className].join(".");
				const UIClass = this._parser.classFactory.getUIClass(classOfTheTag);
				const UIAggregation = this._getUIAggregationRecursively(UIClass, aggregationName);
				if (UIAggregation?.type) {
					const aggregationType = UIAggregation.type;
					const nodeDAO = this._parser.nodeDAO;
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

	private _getCompletionItemsFromClassBody(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const XMLText = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document))?.content;
		const currentPositionOffset = document.offsetAt(position);

		if (XMLText && currentPositionOffset) {
			completionItems = this._getParentTagCompletionItems(document, position, currentPositionOffset);
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

	private _getAttributeCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		const currentPositionOffset = document.offsetAt(position);

		if (XMLFile && currentPositionOffset) {
			const className = this._parser.xmlParser.getClassNameInPosition(XMLFile, currentPositionOffset);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				let controllerMethods = this._parser.xmlParser
					.getMethodsOfTheControl(
						new VSCodeFileReader(this._parser).getControllerNameOfTheCurrentDocument() || ""
					)
					.map(method => method.name);
				const tag = this._parser.xmlParser.getTagInPosition(XMLFile, document.offsetAt(position));
				controllerMethods = [...new Set(controllerMethods)];
				completionItems = this._getPropertyCompletionItemsFromClass(UIClass);
				this._insertIdCompletionItem(completionItems, UIClass, document, tag);
				completionItems = completionItems.concat(
					this._getEventCompletionItemsFromClass(UIClass, controllerMethods)
				);
				completionItems = completionItems.concat(this._getAggregationCompletionItemsFromClass(UIClass));
				completionItems = completionItems.concat(this._getAssociationCompletionItemsFromClass(UIClass));
			}
		}

		return completionItems;
	}

	private _getUIAggregationRecursively(
		UIClass: AbstractJSClass,
		aggregationName: string
	): IUIAggregation | undefined {
		let aggregation: IUIAggregation | undefined;
		aggregation = UIClass.aggregations.find(aggregation => aggregation.name === aggregationName);
		if (!aggregation && UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregation = this._getUIAggregationRecursively(parentClass, aggregationName);
		}

		return aggregation;
	}

	private _getAllAggregationsRecursively(UIClass: AbstractJSClass): IUIAggregation[] {
		let aggregations = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			aggregations = aggregations.concat(this._getAllAggregationsRecursively(parentClass));
		}

		return aggregations;
	}

	private _getUIPropertyRecursively(UIClass: AbstractJSClass, propertyName: string): IUIProperty | undefined {
		let property: IUIProperty | undefined;
		property = UIClass.properties.find(property => property.name === propertyName);
		if (!property && UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			property = this._getUIPropertyRecursively(parentClass, propertyName);
		}

		return property;
	}

	private _getUIEventRecursively(UIClass: AbstractJSClass, eventName: string): IUIEvent | undefined {
		let event: IUIEvent | undefined;
		event = UIClass.events.find(event => event.name === eventName);
		if (!event && UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			event = this._getUIEventRecursively(parentClass, eventName);
		}

		return event;
	}

	private _generateCompletionItemsFromTypeValues(typeValues: ITypeValue[]) {
		return this._removeDuplicateCompletionItems(
			typeValues.map(typeValue => {
				const completionItem = new CustomCompletionItem(typeValue.text, vscode.CompletionItemKind.Keyword);
				completionItem.detail = typeValue.text;
				completionItem.documentation = typeValue.description;
				return completionItem;
			})
		);
	}

	private _getPropertyCompletionItemsFromClass(UIClass: AbstractJSClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.properties.map(property => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(property.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			// const typeValueValues = property.typeValues.map(typeValue => typeValue.text);
			// const insertTextValues = typeValueValues.length > 0 ? `|${typeValueValues.join(",")}|` : "";
			completionItem.insertText = new vscode.SnippetString(`${property.name}`);
			completionItem.detail = `${property.name}: ${property.type}`;
			const UI5ApiUri = this._parser.urlBuilder.getMarkupUrlForPropertiesApi(UIClass);
			completionItem.documentation = new HTMLMarkdown(`${UI5ApiUri}\n${property.description}`);
			completionItem.sortText = "1";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getPropertyCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _insertIdCompletionItem(
		allCompletionItems: CustomCompletionItem[],
		UIClass: AbstractJSClass,
		document: vscode.TextDocument,
		tag: ITag
	) {
		const properties = this._parser.classFactory.getClassProperties(UIClass.className);
		const idProperty = properties.find(property => property.name === "id");
		if (!idProperty) {
			return;
		}

		const idCompletionItem: CustomCompletionItem = new CustomCompletionItem("id");
		idCompletionItem.kind = vscode.CompletionItemKind.Property;
		idCompletionItem.insertText = new vscode.SnippetString(`id="${this._generateControlId(document, tag)}"$0`);

		idCompletionItem.detail = "id: string";
		const UI5ApiUri = this._parser.urlBuilder.getMarkupUrlForPropertiesApi(UIClass);
		idCompletionItem.documentation = new HTMLMarkdown(`${UI5ApiUri}\n${idProperty.description}`);
		idCompletionItem.sortText = "1";

		const index = allCompletionItems.findIndex(completionItem => completionItem.label === "id");
		if (index > -1) {
			allCompletionItems.splice(index, 1, idCompletionItem);
		}
	}

	private _generateControlId(document: vscode.TextDocument, tag: ITag): string {
		const generator = new GenerateIDCommand(new TextDocumentAdapter(document), this._parser);

		const transformer = new VSCodeTextDocumentTransformer(this._parser);
		const XMLFile = transformer.toXMLFile(document);
		if (!XMLFile) {
			return "";
		}

		const allIds = this._parser.xmlParser.getAllIDsInCurrentView(XMLFile).map(id => id.id);
		return generator.generateId(tag, allIds, false).replace(/\{TabStop\}/g, "$1");
	}

	private _getEventCompletionItemsFromClass(UIClass: AbstractJSClass, eventValues: string[] = []) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.events.map(event => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(event.name);
			completionItem.kind = vscode.CompletionItemKind.Event;
			// const insertTextValues = eventValues.length > 0 ? `|${eventValues.join(",")}|` : "";
			completionItem.insertText = new vscode.SnippetString(`${event.name}`);
			completionItem.detail = event.name;
			const UI5ApiUri = this._parser.urlBuilder.getMarkupUrlForEventsApi(UIClass, event.name);
			completionItem.documentation = new HTMLMarkdown(`${UI5ApiUri}\n${event.description}`);
			completionItem.sortText = "2";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getEventCompletionItemsFromClass(parentClass, eventValues));
		}

		return completionItems;
	}

	private _getAggregationCompletionItemsFromClass(UIClass: AbstractJSClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.aggregations.map(aggregation => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(aggregation.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${aggregation.name}`);
			completionItem.detail = aggregation.name;
			const UI5ApiUri = this._parser.urlBuilder.getMarkupUrlForAggregationApi(UIClass);
			completionItem.documentation = new HTMLMarkdown(
				`${UI5ApiUri}\n${aggregation.description}\n${aggregation.type}`
			);
			completionItem.sortText = "3";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getAggregationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _getAssociationCompletionItemsFromClass(UIClass: AbstractJSClass) {
		let completionItems: CustomCompletionItem[] = [];

		completionItems = UIClass.associations.map(association => {
			const completionItem: CustomCompletionItem = new CustomCompletionItem(association.name);
			completionItem.kind = vscode.CompletionItemKind.Property;
			completionItem.insertText = new vscode.SnippetString(`${association.name}`);
			completionItem.detail = association.name;
			const UI5ApiUri = this._parser.urlBuilder.getMarkupUrlForAssociationApi(UIClass);
			completionItem.documentation = new HTMLMarkdown(`${UI5ApiUri}\n${association.description}`);
			completionItem.sortText = "4";

			return completionItem;
		});

		if (UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			completionItems = completionItems.concat(this._getAssociationCompletionItemsFromClass(parentClass));
		}

		return completionItems;
	}

	private _removeDuplicateCompletionItems(completionItems: CustomCompletionItem[]) {
		completionItems = completionItems.reduce(
			(accumulator: CustomCompletionItem[], completionItem: CustomCompletionItem) => {
				const methodInAccumulator = accumulator.find(
					accumulatedCompletionItem => accumulatedCompletionItem.label === completionItem.label
				);
				if (!methodInAccumulator) {
					accumulator.push(completionItem);
				}
				return accumulator;
			},
			[]
		);

		return completionItems;
	}
}
