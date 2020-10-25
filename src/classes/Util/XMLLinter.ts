import { XMLParser } from "./XMLParser";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import * as vscode from "vscode";
import LineColumn = require("line-column");

function isNumeric(value: string) {
	return /^-{0,1}\d+$/.test(value);
}

export interface Error {
	code: string;
	message: string;
	source: string;
	range: vscode.Range;
}

export interface Tag {
	text: string;
	positionBegin: number;
	positionEnd: number;
}

interface AttributeValidation {
	valid: boolean;
	message?: string;
}

export class XMLLinter {
	static lintDocument(document: string) {
		const errors: Error[] = [];

		const tags = this.getAllTags(document);
		tags.forEach(tag => {
			const tagAttributes = tag.text.match(/(?<=\s)(\w|:)*(\s?)=(\s?)"(\s|.)*?"/g);
			if (tagAttributes) {

				const tagPrefix = XMLParser.getTagPrefix(tag.text);
				const className = XMLParser.getClassNameFromTag(tag.text);

				if (className) {
					const libraryPath = XMLParser.getLibraryPathFromTagPrefix(document, tagPrefix, tag.positionEnd);
					const classOfTheTag = [libraryPath, className].join(".");
					tagAttributes.forEach(tagAttribute => {
						const attributeValidation = this.validateTagAttribute(classOfTheTag, tagAttribute);
						if (!attributeValidation.valid) {
							const indexOfTagBegining = tag.text.indexOf(tagAttribute);
							const position = LineColumn(document).fromIndex(tag.positionBegin + indexOfTagBegining);
							if (position) {
								errors.push({
									code: "UI5plugin",
									message: attributeValidation.message || "Invalid attribute",
									source: tagAttribute,
									range: new vscode.Range(
										new vscode.Position(position.line - 1, position.col),
										new vscode.Position(position.line - 1, position.col + tagAttribute.length)
									)
								});
							}
						}
					});


				}
			}
		});

		const aPrefixes = document.match(/(?<=xmlns:).*?(?==)/g);
		aPrefixes?.forEach(prefix => {
			const aPrefixes = new RegExp(`(?<=<)${prefix}:`, "g").exec(document);
			if (!aPrefixes || aPrefixes.length === 0) {

				const positionBegin = document.indexOf(`xmlns:${prefix}=`);
				const position = LineColumn(document).fromIndex(positionBegin - 1);
				if (position) {
					errors.push({
						code: "UI5plugin",
						message: "Unused namespace",
						source: prefix,
						range: new vscode.Range(
							new vscode.Position(position.line - 1, position.col),
							new vscode.Position(position.line - 1, position.col + "xmlns:".length + prefix.length)
						)
					});
				}
			}
		});

		return errors;
	}

	private static getAllTags(document: string) {
		let i = 0;
		const tags: Tag[] = [];

		while (i < document.length) {
			const thisIsTagEnd = document[i] === ">" && !XMLParser.getIfPositionIsInString(document, i);
			if (thisIsTagEnd) {
				const indexOfTagBegining = this.getTagBeginingIndex(document, i);
				tags.push({
					text: document.substring(indexOfTagBegining, i + 1),
					positionBegin: indexOfTagBegining - 1,
					positionEnd: i
				});
			}
			i++;
		}

		return tags;
	}

	private static getTagBeginingIndex(document: string, position: number) {
		let i = position;

		while(i > 0 && (document[i] !== "<" || XMLParser.getIfPositionIsInString(document, i))) {
			i--;
		}

		return i;
	}

	private static validateTagAttribute(className: string, attribute: string): AttributeValidation {
		let attributeValidation: AttributeValidation = {
			valid: false
		};

		const UIClass = UIClassFactory.getUIClass(className);
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();

		const isExclusion = attributeName.startsWith("xmlns") || this.isAttributeAlwaysValid(className, attributeName);
		const attributeNameValid = isExclusion || this.validateAttributeName(className, attribute);
		const attributeValueValid = this.validateAttributeValue(className, attribute);
		attributeValidation.valid = attributeNameValid && attributeValueValid;

		if (!attributeNameValid && UIClass.parentClassNameDotNotation) {
			attributeValidation = this.validateTagAttribute(UIClass.parentClassNameDotNotation, attribute);
		} else if (!attributeValidation.valid) {
			attributeValidation.message = !attributeNameValid ? "Invalid attribute name" : !attributeValueValid ? "Invalid value" : undefined;
		}

		return attributeValidation;
	}

	private static validateAttributeValue(className: string, attribute: string) {
		let isValueValid = true;
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		let attributeValue = attribute.replace(attributeName, "").replace("=", "").trim();
		attributeValue = attributeValue.substring(1, attributeValue.length - 1); // removes ""

		const UIClass = UIClassFactory.getUIClass(className);
		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const isAttributeBinded = attributeValue.startsWith("{") && attributeValue.endsWith("}");

		if (isAttributeBinded || property?.type === "string") {
			isValueValid = true;
		} else if (property?.type === "sap.ui.core.URI") {
			isValueValid = true;
		} else if (property && property.typeValues.length > 0) {
			isValueValid = !!property.typeValues.find(typeValue => typeValue.text === attributeValue);
		} else if (property?.type === "boolean") {
			isValueValid = ["true", "false"].indexOf(attributeValue) > -1;
		} else if (property?.type === "int") {
			isValueValid = isNumeric(attributeValue);
		} else if (event && XMLParser.getControllerNameOfTheCurrentDocument()) {
			attributeValue = attributeValue.replace(".", "");
			isValueValid = !!XMLParser.getMethodsOfTheCurrentViewsController().find(method => method.name === attributeValue);
		}

		return isValueValid;
	}

	private static validateAttributeName(className: string, attribute: string) {
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		const UIClass = UIClassFactory.getUIClass(className);

		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const aggregation = UIClass.aggregations.find(aggregation => aggregation.name === attributeName);
		const association = UIClass.associations.find(association => association.name === attributeName);

		const somethingInClassWasFound = !!(property || event || aggregation || association);

		return somethingInClassWasFound;
	}

	private static isAttributeAlwaysValid(className: string, attribute: string) {
		const exclusions: any = {
			"*": ["id", "class"],
			"sap.ui.core.mvc.View": ["controllerName"],
			"sap.ui.core.mvc.XMLView": ["async"],
			"sap.ui.core.Fragment": ["fragmentName"],
			"sap.ui.core.ExtensionPoint": ["name"]
		};

		const isClassExclusion = exclusions[className] && exclusions[className].indexOf(attribute) > -1;
		const isAlwaysExclusion = exclusions["*"].indexOf(attribute) > -1;
		const perhapsItIsCustomData = attribute.indexOf(":") > -1;

		return isClassExclusion || isAlwaysExclusion || perhapsItIsCustomData;

	}
}