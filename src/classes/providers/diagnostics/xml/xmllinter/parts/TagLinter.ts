import { Error, Linter, Tag } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { XMLParser } from "../../../../../utils/XMLParser";
import { UIAggregation } from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";


export class TagLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];
		const documentText = document.getText();

		//check tags
		// console.time("Tag linter");
		XMLParser.setCurrentDocument(documentText);

		const tags = XMLParser.getAllTags(documentText);
		tags.forEach(tag => {
			errors.push(...this._getClassNameErrors(tag, document));
		});

		XMLParser.setCurrentDocument(undefined);
		// console.timeEnd("Tag linter");

		return errors;
	}

	private _getClassNameErrors(tag: Tag, document: vscode.TextDocument) {
		const documentText = document.getText();
		const errors: Error[] = [];
		const tagClass = XMLParser.getFullClassNameFromTag(tag, documentText);
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
			if (tagName) {
				const isAggregation = tagName[0].toLowerCase() === tagName[0];

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
				}
			} else {
				let position = tag.positionBegin;
				if (tag.text.startsWith("</")) {
					position = tag.positionEnd;
				}
				const parentTag = XMLParser.getParentTagAtPosition(documentText, position - 1);
				if (parentTag.text) {
					const tagClass = XMLParser.getFullClassNameFromTag(parentTag, documentText);
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

	private _findAggregation(className: string, aggregationName: string): UIAggregation | undefined {
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