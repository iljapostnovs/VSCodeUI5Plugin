import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass, ICustomClassJSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/StandardUIClass";
import { CustomTSClass, ICustomClassTSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";

export class XMLHoverProvider extends ParserBearer {
	getHovers(document: vscode.TextDocument, position: vscode.Position) {
		const range = document.getWordRangeAtPosition(position);
		const wordWithPrefix = document.getText(range);
		const wordWithPrefixParts = wordWithPrefix.split(":");
		const word = wordWithPrefixParts.pop();
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (XMLFile) {
			const allTags = this._parser.xmlParser.getAllTags(XMLFile);
			const tag = allTags.find(tag => tag.positionBegin < offset && tag.positionEnd >= offset);
			if (tag) {
				const tagName = this._parser.xmlParser.getClassNameFromTag(tag.text);
				const classOfTheTag = this._parser.xmlParser.getClassNameInPosition(XMLFile, offset);
				const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
				const attribute = attributes?.find(attribute => {
					const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
					return attributeName === word;
				});
				const attributeValue = attributes?.find(attribute => {
					const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
					return attributeValue === word;
				});

				if (attribute) {
					//highlighted text is attribute
					const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
					const text = this._getTextIfItIsFieldOrMethodOfClass(classOfTheTag, attributeName);

					if (text) {
						const markdownString = new vscode.MarkdownString();
						markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					}
				} else if (attributeValue) {
					const { attributeName, attributeValue: attributeVal } =
						this._parser.xmlParser.getAttributeNameAndValue(attributeValue);
					const property = this._parser.classFactory
						.getClassProperties(classOfTheTag)
						.find(property => property.name === attributeName);
					const responsibleClass = this._parser.fileReader.getResponsibleClassForXMLDocument(
						new TextDocumentAdapter(document)
					);
					const method =
						responsibleClass &&
						this._parser.classFactory
							.getClassMethods(responsibleClass)
							.find(method => method.name === attributeVal);
					const responsibleUIClass = method && this._parser.classFactory.getUIClass(method.owner);
					const value = property?.typeValues.find(value => value.text === attributeVal);
					if (property && value) {
						const markdownString = new vscode.MarkdownString();
						const text = `**${value.text}**: ${value.description}`;
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					} else if (
						responsibleUIClass &&
						responsibleUIClass instanceof AbstractCustomClass &&
						responsibleUIClass.classText &&
						method
					) {
						if (responsibleUIClass instanceof CustomJSClass) {
							const customMethod = method as ICustomClassJSMethod;
							if (customMethod.node) {
								const methodText = responsibleUIClass.classText.substring(
									customMethod.node.start,
									customMethod.node.end
								);
								const markdownString = new vscode.MarkdownString();
								const text = "**Ctrl + Left Click** to navigate";
								markdownString.appendMarkdown(text);
								markdownString.appendCodeblock(methodText.replace(/\t/g, " "), "javascript");
								hover = new vscode.Hover(markdownString);
							}
						}
						if (responsibleUIClass instanceof CustomTSClass) {
							const customTSMethod = method as ICustomClassTSMethod;
							if (customTSMethod.node) {
								const methodText = responsibleUIClass.classText.substring(
									customTSMethod.node.getStart(),
									customTSMethod.node.getEnd()
								);
								const markdownString = new vscode.MarkdownString();
								const text = "**Ctrl + Left Click** to navigate";
								markdownString.appendMarkdown(text);
								markdownString.appendCodeblock(methodText.replace(/\t/g, " "), "typescript");
								hover = new vscode.Hover(markdownString);
							}
						}
					}
				} else if (tagName === word) {
					//highlighted text is class or aggregation
					const isClassName = word[0].toUpperCase() === word[0];
					if (isClassName) {
						//is class
						const markdownString = new vscode.MarkdownString();
						markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
						const UIClass = this._parser.classFactory.getUIClass(classOfTheTag);
						const node = this._parser.nodeDAO.findNode(UIClass.className);
						let classDescription = node?.getMetadata()?.getRawMetadata()?.description || "";
						classDescription = StandardUIClass.removeTags(classDescription);
						const description = classDescription ? `  \n${classDescription}` : "";
						const text = `${this._parser.urlBuilder.getMarkupUrlForClassApi(UIClass)}${description}`;
						markdownString.appendMarkdown(text);
						hover = new vscode.Hover(markdownString);
					} else {
						//is aggregation
						let parentTag = this._parser.xmlParser.getParentTagAtPosition(XMLFile, offset);
						const tagClass = this._parser.xmlParser.getClassNameInPosition(
							XMLFile,
							parentTag.positionBegin
						);

						if (!this._isThisAClass(tagClass)) {
							parentTag = this._parser.xmlParser.getParentTagAtPosition(
								XMLFile,
								parentTag.positionBegin - 1
							);
						}

						const classOfTheTag = this._parser.xmlParser.getClassNameInPosition(
							XMLFile,
							parentTag.positionBegin
						);
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

	private _isThisAClass(name: string) {
		const classNameParts = name.split(".");
		const lastPart = classNameParts[classNameParts.length - 1];
		const isClass = lastPart[0] === lastPart[0].toUpperCase();

		return isClass;
	}

	private _getTextIfItIsFieldOrMethodOfClass(className: string, attributeName: string) {
		let text = "";
		const UIClass = this._parser.classFactory.getUIClass(className);
		const aggregation = UIClass.aggregations.find(aggregation => aggregation.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const property = UIClass.properties.find(property => property.name === attributeName);
		let api = "";
		if (aggregation) {
			text = `aggregation: **${aggregation.name}**  \ntype: **${aggregation.type}**  \nmultiple: ${aggregation.multiple}  \n\n${aggregation.description}`;
			api = this._parser.urlBuilder.getMarkupUrlForAggregationApi(UIClass);
		}
		if (event) {
			text = `event: **${event.name}**  \n\n${event.description}`;
			api = this._parser.urlBuilder.getMarkupUrlForEventsApi(UIClass, event.name);

			if (event.params.length > 0) {
				text += `  \n\nParameters:  \n${event.params
					.map(param => `*${param.name}*: ${param.type}`)
					.join("  \n")}`;
			}
		}
		if (property) {
			text = `property: **${property.name}**  \ntype: **${property.type}**  \n\n${property.description}`;

			const typeValues = property.typeValues.map(typeValue => `*${typeValue.text}* - ${typeValue.description}`);
			if (typeValues.length > 0) {
				text += `  \n\nValues:  \n${typeValues.join("  \n")}`;
			}
			api = this._parser.urlBuilder.getMarkupUrlForPropertiesApi(UIClass);
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
