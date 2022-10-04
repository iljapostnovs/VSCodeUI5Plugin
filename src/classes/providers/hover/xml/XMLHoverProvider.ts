import { XMLParser } from "ui5plugin-parser";
import { SAPNodeDAO } from "ui5plugin-parser/dist/classes/librarydata/SAPNodeDAO";
import { CustomUIClass, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { URLBuilder } from "ui5plugin-parser/dist/classes/utils/URLBuilder";
import * as vscode from "vscode";
import { CustomTSClass, ICustomClassTSMethod } from "../../../../typescript/parsing/classes/CustomTSClass";
import { UI5Plugin } from "../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";

export class XMLHoverProvider {
	static getTextEdits(document: vscode.TextDocument, position: vscode.Position) {
		const range = document.getWordRangeAtPosition(position);
		const wordWithPrefix = document.getText(range);
		const wordWithPrefixParts = wordWithPrefix.split(":");
		const word = wordWithPrefixParts.pop();
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		const XMLFile = TextDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (XMLFile) {
			const allTags = XMLParser.getAllTags(XMLFile);
			const tag = allTags.find(tag => tag.positionBegin < offset && tag.positionEnd >= offset);
			if (tag) {
				const tagName = XMLParser.getClassNameFromTag(tag.text);
				const classOfTheTag = XMLParser.getClassNameInPosition(XMLFile, offset);
				const attributes = XMLParser.getAttributesOfTheTag(tag);
				const attribute = attributes?.find(attribute => {
					const { attributeName } = XMLParser.getAttributeNameAndValue(attribute);
					return attributeName === word;
				});
				const attributeValue = attributes?.find(attribute => {
					const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
					return attributeValue === word;
				});

				if (attribute) {
					//highlighted text is attribute
					const { attributeName } = XMLParser.getAttributeNameAndValue(attribute);
					const text = this._getTextIfItIsFieldOrMethodOfClass(classOfTheTag, attributeName);

					if (text) {
						const markdownString = new vscode.MarkdownString();
						markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					}
				} else if (attributeValue) {
					const { attributeName, attributeValue: attributeVal } = XMLParser.getAttributeNameAndValue(attributeValue);					const property = UI5Plugin.getInstance().parser.classFactory.getClassProperties(classOfTheTag).find(property => property.name === attributeName);
					const responsibleClass = UI5Plugin.getInstance().parser.fileReader.getResponsibleClassForXMLDocument(new TextDocumentAdapter(document));
					const method = responsibleClass && UI5Plugin.getInstance().parser.classFactory.getClassMethods(responsibleClass).find(method => method.name === attributeVal);
					const responsibleUIClass = method && UI5Plugin.getInstance().parser.classFactory.getUIClass(method.owner);
					const value = property?.typeValues.find(value => value.text === attributeVal);
					if (property && value) {
						const markdownString = new vscode.MarkdownString();
						const text = `**${value.text}**: ${value.description}`;
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					} else if (responsibleUIClass && (responsibleUIClass instanceof CustomUIClass || responsibleUIClass instanceof CustomTSClass) && responsibleUIClass.classText && method) {
						const customMethod = method as ICustomClassUIMethod;
						if (customMethod.acornNode) {
							const methodText = responsibleUIClass.classText.substring(customMethod.acornNode.start, customMethod.acornNode.end);
							const markdownString = new vscode.MarkdownString();
							const text = "**Ctrl + Left Click** to navigate";
							markdownString.appendMarkdown(text);
							markdownString.appendCodeblock(methodText.replace(/\t/g, " "), "javascript");
							hover = new vscode.Hover(markdownString);
						}
						const customTSMethod = method as ICustomClassTSMethod;
						if (customTSMethod.tsNode) {
							const methodText = responsibleUIClass.classText.substring(customTSMethod.tsNode.getStart(), customTSMethod.tsNode.getEnd());
							const markdownString = new vscode.MarkdownString();
							const text = "**Ctrl + Left Click** to navigate";
							markdownString.appendMarkdown(text);
							markdownString.appendCodeblock(methodText.replace(/\t/g, " "), "typescript");
							hover = new vscode.Hover(markdownString);
						}
					}

				} else if (tagName === word) {
					//highlighted text is class or aggregation
					const isClassName = word[0].toUpperCase() === word[0];
					if (isClassName) {
						//is class
						const markdownString = new vscode.MarkdownString();
						markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
						const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(classOfTheTag);
						const node = new SAPNodeDAO().findNode(UIClass.className);
						let classDescription = node?.getMetadata()?.getRawMetadata()?.description || "";
						classDescription = StandardUIClass.removeTags(classDescription);
						const description = classDescription ? `  \n${classDescription}` : "";
						const text = `${URLBuilder.getInstance().getMarkupUrlForClassApi(UIClass)}${description}`;
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					} else {
						//is aggregation
						let parentTag = XMLParser.getParentTagAtPosition(XMLFile, offset);
						const tagClass = XMLParser.getClassNameInPosition(XMLFile, parentTag.positionBegin);

						if (!this._isThisAClass(tagClass)) {
							parentTag = XMLParser.getParentTagAtPosition(XMLFile, parentTag.positionBegin - 1);
						}

						const classOfTheTag = XMLParser.getClassNameInPosition(XMLFile, parentTag.positionBegin);
						const text = this._getTextIfItIsFieldOrMethodOfClass(classOfTheTag, word);

						if (text) {
							const markdownString = new vscode.MarkdownString();
							markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
							markdownString.appendMarkdown(text);
							hover = new vscode.Hover(markdownString);
						}
					}
				}
			}
		}

		return hover;
	}

	private static _isThisAClass(name: string) {
		const classNameParts = name.split(".");
		const lastPart = classNameParts[classNameParts.length - 1];
		const isClass = lastPart[0] === lastPart[0].toUpperCase();

		return isClass;
	}

	private static _getTextIfItIsFieldOrMethodOfClass(className: string, attributeName: string) {
		let text = "";
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		const aggregation = UIClass.aggregations.find(aggregation => aggregation.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const property = UIClass.properties.find(property => property.name === attributeName);
		let api = "";
		if (aggregation) {
			text = `aggregation: **${aggregation.name}**  \ntype: **${aggregation.type}**  \nmultiple: ${aggregation.multiple}  \n\n${aggregation.description}`;
			api = URLBuilder.getInstance().getMarkupUrlForAggregationApi(UIClass);
		}
		if (event) {
			text = `event: **${event.name}**  \n\n${event.description}`;
			api = URLBuilder.getInstance().getMarkupUrlForEventsApi(UIClass, event.name);

			if (event.params.length > 0) {
				text += `  \n\nParameters:  \n${event.params.map(param => `*${param.name}*: ${param.type}`).join("  \n")}`;
			}
		}
		if (property) {
			text = `property: **${property.name}**  \ntype: **${property.type}**  \n\n${property.description}`;

			const typeValues = property.typeValues.map(typeValue => `*${typeValue.text}* - ${typeValue.description}`);
			if (typeValues.length > 0) {
				text += `  \n\nValues:  \n${typeValues.join("  \n")}`;
			}
			api = URLBuilder.getInstance().getMarkupUrlForPropertiesApi(UIClass);
		}

		if (api) {
			text = `${api}  \n${text}`;
		}

		if (!text && UIClass.parentClassNameDotNotation) {
			text = this._getTextIfItIsFieldOrMethodOfClass(UIClass.parentClassNameDotNotation, attributeName);
		}

		return text;
	}
}