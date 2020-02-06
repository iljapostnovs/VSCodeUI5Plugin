import { XMLParser } from "./XMLParser";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import * as vscode from "vscode";
import LineColumn from 'line-column';

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

export class XMLLinter {
	static lintDocument(document: string) {
		const errors: Error[] = [];

		const tags = this.getAllTags(document);
		tags.forEach(tag => {
			const tagAttributes = tag.text.match(/(?<=\s)(\w|:)*="(\w|\.)*"/g);
			if (tagAttributes) {

				const tagPrefix = XMLParser.getTagPrefix(tag.text);
				const className = XMLParser.getClassNameFromTag(tag.text);

				if (className) {
					const libraryPath = XMLParser.getLibraryPathFromTagPrefix(document, tagPrefix);
					const classOfTheTag = [libraryPath, className].join(".");
					tagAttributes.forEach(tagAttribute => {
						const isAttributeValid = this.validateTagAttribute(classOfTheTag, tagAttribute);
						if (!isAttributeValid) {
							const indexOfTagBegining = tag.text.indexOf(tagAttribute);
							const position = LineColumn(document).fromIndex(tag.positionBegin + indexOfTagBegining);
							if (position) {
								errors.push({
									code: "UI5plugin",
									message: "Invalid attribute",
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

	private static validateTagAttribute(className: string, attribute: string): boolean {
		let isAttributeValid = false;

		const exclusions = [
			"id",
			"controllerName",
			"class",
			"fragmentName"
		];

		const UIClass = UIClassFactory.getUIClass(className);
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const aggregation = UIClass.aggregations.find(aggregation => aggregation.name === attributeName);
		const somethingInClassWasFound = !!(property || event || aggregation);
		const isExclusion = attributeName.startsWith("xmlns") || exclusions.indexOf(attributeName) > -1;

		if (isExclusion) {
			isAttributeValid = true;
		} else if (!somethingInClassWasFound && UIClass.parentClassNameDotNotation) {
			isAttributeValid = this.validateTagAttribute(UIClass.parentClassNameDotNotation, attribute);
		} else if (somethingInClassWasFound) {
			isAttributeValid = true;
		}

		return isAttributeValid;
	}
}