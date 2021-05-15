import { IError, Linter, ITag } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { XMLParser } from "../../../../../utils/XMLParser";
import { IUIAggregation } from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { IXMLFile } from "../../../../../utils/FileReader";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";


export class TagLinter extends Linter {
	getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];
		const XMLFile = TextDocumentTransformer.toXMLFile(document);
		if (XMLFile) {
			const tags = XMLParser.getAllTags(XMLFile);
			tags.forEach(tag => {
				errors.push(...this._getClassNameErrors(tag, XMLFile));
			});
		}

		// console.time("Tag linter");
		// console.timeEnd("Tag linter");

		return errors;
	}

	private _getClassNameErrors(tag: ITag, XMLFile: IXMLFile) {
		const documentText = XMLFile.content;
		const errors: IError[] = [];
		const tagClass = XMLParser.getFullClassNameFromTag(tag, XMLFile);
		if (!tagClass) {
			const positionBegin = LineColumn(documentText).fromIndex(tag.positionBegin);
			const positionEnd = LineColumn(documentText).fromIndex(tag.positionEnd);

			if (positionBegin && positionEnd) {
				const prefix = XMLParser.getTagPrefix(tag.text);
				errors.push({
					code: "UI5plugin",
					message: `"${prefix}" prefix is not defined`,
					source: "Tag Linter",
					range: new vscode.Range(
						new vscode.Position(positionBegin.line - 1, positionBegin.col - 1),
						new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
					)
				});
			}
		} else {
			const tagName = tagClass.split(".")[tagClass.split(".").length - 1];
			const isAggregation = tagName[0] ? tagName[0].toLowerCase() === tagName[0] : false;

			if (!isAggregation) {
				const UIClass = UIClassFactory.getUIClass(tagClass);
				if (!UIClass.classExists && !this._isClassException(tagClass)) {
					const positionBegin = LineColumn(documentText).fromIndex(tag.positionBegin);
					const positionEnd = LineColumn(documentText).fromIndex(tag.positionEnd);
					if (positionBegin && positionEnd && XMLParser.getIfPositionIsNotInComments(documentText, tag.positionBegin)) {
						errors.push({
							code: "UI5plugin",
							message: `"${tagClass}" class doesn't exist`,
							source: "Tag Linter",
							range: new vscode.Range(
								new vscode.Position(positionBegin.line - 1, positionBegin.col - 1),
								new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
							)
						});
					}
				}
			} else {
				let position = tag.positionBegin;
				if (tag.text.startsWith("</")) {
					position = tag.positionEnd;
				}
				const parentTag = XMLParser.getParentTagAtPosition(XMLFile, position - 1);
				if (parentTag.text) {
					const tagClass = XMLParser.getFullClassNameFromTag(parentTag, XMLFile);
					if (tagClass) {
						const aggregation = this._findAggregation(tagClass, tagName);
						if (!aggregation) {
							const positionBegin = LineColumn(documentText).fromIndex(tag.positionBegin);
							const positionEnd = LineColumn(documentText).fromIndex(tag.positionEnd);
							if (positionBegin && positionEnd && XMLParser.getIfPositionIsNotInComments(documentText, tag.positionBegin)) {
								errors.push({
									code: "UI5plugin",
									message: `"${tagName}" aggregation doesn't exist in "${tagClass}"`,
									source: "Tag Linter",
									range: new vscode.Range(
										new vscode.Position(positionBegin.line - 1, positionBegin.col - 1),
										new vscode.Position(positionEnd.line - 1, positionEnd.col - 1)
									)
								});
							}
						}
					}
				}
			}
		}

		return errors;
	}

	private _findAggregation(className: string, aggregationName: string): IUIAggregation | undefined {
		const UIClass = UIClassFactory.getUIClass(className);
		let aggregation = UIClass.aggregations.find(aggregation => aggregation.name === aggregationName);
		if (!aggregation && UIClass.parentClassNameDotNotation) {
			aggregation = this._findAggregation(UIClass.parentClassNameDotNotation, aggregationName);
		}

		return aggregation;
	}

	private _isClassException(className: string) {
		const exceptions = ["sap.ui.core.FragmentDefinition"];

		return exceptions.includes(className);
	}
}