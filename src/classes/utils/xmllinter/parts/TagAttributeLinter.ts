import { Tag, Error, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { XMLParser } from "../../XMLParser";
import LineColumn = require("line-column");
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";

interface AttributeValidation {
	valid: boolean;
	message?: string;
}

function isNumeric(value: string) {
	return /^-{0,1}\d+$/.test(value);
}

export class TagAttributeLinter extends Linter {
	getErrors(document: string): Error[] {
		const errors: Error[] = [];

		//check tags
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
						//check tag attributes
						const attributeValidation = this.validateTagAttribute(classOfTheTag, tagAttribute);
						if (!attributeValidation.valid) {
							const indexOfTagBegining = tag.text.indexOf(tagAttribute);
							const position = LineColumn(document).fromIndex(tag.positionBegin + indexOfTagBegining);
							if (position && this.positionIsNotInComments(document, tag.positionBegin)) {
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

		return errors;
	}

	private positionIsNotInComments(document: string, position: number) {
		let isPositionNotInComments = true;
		const regExp = new RegExp("<!--(.|\\s)*?-->", "g");
		const aComments: RegExpExecArray[] = [];

		let result = regExp.exec(document);
		while (result) {
			aComments.push(result);
			result = regExp.exec(document);
		}

		const comment = aComments.find(comment => comment.index <= position && comment.index + comment[0].length > position);

		isPositionNotInComments = !comment;

		return isPositionNotInComments;
	}

	private getAllTags(document: string) {
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

	private getTagBeginingIndex(document: string, position: number) {
		let i = position;

		while(i > 0 && (document[i] !== "<" || XMLParser.getIfPositionIsInString(document, i))) {
			i--;
		}

		return i;
	}

	private validateTagAttribute(className: string, attribute: string): AttributeValidation {
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

	private validateAttributeValue(className: string, attribute: string) {
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

	private validateAttributeName(className: string, attribute: string) {
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

	private isAttributeAlwaysValid(className: string, attribute: string) {
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