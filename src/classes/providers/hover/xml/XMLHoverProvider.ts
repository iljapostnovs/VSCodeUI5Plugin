import * as vscode from "vscode";
import { SAPNodeDAO } from "../../../librarydata/SAPNodeDAO";
import { StandardUIClass } from "../../../UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { XMLFileTransformer } from "../../../utils/FileReader";
import { URLBuilder } from "../../../utils/URLBuilder";
import { XMLParser } from "../../../utils/XMLParser";

export class XMLHoverProvider {
	static getTextEdits(document: vscode.TextDocument, position: vscode.Position) {
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		const XMLFile = XMLFileTransformer.transformFromVSCodeDocument(document);
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
				} else if (tagName === word) {
					//highlighted text is class or aggregation
					const isClassName = word[0].toUpperCase() === word[0];
					if (isClassName) {
						//is class
						const markdownString = new vscode.MarkdownString();
						markdownString.appendCodeblock(`class ${classOfTheTag}  \n`);
						const UIClass = UIClassFactory.getUIClass(classOfTheTag);
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
		const UIClass = UIClassFactory.getUIClass(className);
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