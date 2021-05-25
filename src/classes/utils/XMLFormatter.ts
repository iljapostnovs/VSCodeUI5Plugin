import * as vscode from "vscode";
import { ITag } from "../providers/diagnostics/xml/xmllinter/parts/abstraction/Linter";
import { IXMLFile } from "./FileReader";
import { TextDocumentTransformer } from "./TextDocumentTransformer";
import { XMLParser } from "./XMLParser";

export class XMLFormatter {
	static formatDocument(document: vscode.TextDocument) {
		const textEdits: vscode.TextEdit[] = [];
		const documentText = document.getText();

		const XMLFile = TextDocumentTransformer.toXMLFile(document, true);
		if (XMLFile) {
			const allTags = this._getAllTags(XMLFile);

			if (allTags.length > 0) {
				let indentationLevel = 0;
				const aTagTexts = allTags.map(currentTag => {
					if (currentTag.text.startsWith("<!--")) {
						const indentation = this._getIndentation(indentationLevel);
						return `${indentation}${currentTag.text}`;
					} else {
						const tagName = this._getTagName(currentTag.text);
						const tagAttributes = this._getTagAttributes(currentTag.text);
						let endSubstraction = 1;
						if (currentTag.text.endsWith("/>")) {
							endSubstraction = 2;
						}
						const tagEnd = currentTag.text.substring(
							currentTag.text.length - endSubstraction,
							currentTag.text.length
						);

						let beginAddition = 1;
						if (currentTag.text.startsWith("</")) {
							beginAddition = 2;
						}
						const tagBegin = currentTag.text.substring(0, beginAddition);

						indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, true);
						let indentation = this._getIndentation(indentationLevel);

						let newTag = `${indentation}${tagBegin}${tagName}\n`;

						if (tagAttributes.length === 1) {
							newTag = newTag.trimRight();
						}
						newTag += tagAttributes.reduce((accumulator, tagAttribute) => {
							const tagData = XMLParser.getAttributeNameAndValue(tagAttribute);
							accumulator += `${indentation}\t${tagData.attributeName}="${tagData.attributeValue}"\n`;
							if (tagAttributes.length === 1) {
								accumulator = ` ${accumulator.trimLeft()}`;
							}
							return accumulator;
						}, "");

						if (tagAttributes.length <= 1) {
							newTag = newTag.trimRight();
							indentation = "";
						}

						newTag += `${indentation}${tagEnd}`;

						indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, false);

						return newTag;
					}
				}).reduce((accumulator: string[], currentTag) => {
					const lastTagInAccumulator = accumulator[accumulator.length - 1];
					if (lastTagInAccumulator) {
						const lastTagName = XMLParser.getClassNameFromTag(lastTagInAccumulator.trim());
						const currentTagName = XMLParser.getClassNameFromTag(currentTag.trim());
						const tagClassNamesAreTheSame = lastTagName && currentTagName && lastTagName === currentTagName;
						const previousTagIsAClass = lastTagName && lastTagName[0] === lastTagName[0].toUpperCase();
						if (previousTagIsAClass && tagClassNamesAreTheSame && currentTag.trim().startsWith("</") && lastTagInAccumulator.trim().endsWith(">") && !lastTagInAccumulator.trim().endsWith("/>")) {
							accumulator[accumulator.length - 1] = `${lastTagInAccumulator.substring(0, lastTagInAccumulator.length - 1)}/>`;
						} else {
							accumulator.push(currentTag);
						}
					} else {
						accumulator.push(currentTag);
					}

					return accumulator;
				}, []);

				const positionBegin = document.positionAt(0);
				const positionEnd = document.positionAt(documentText.length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const textEdit = new vscode.TextEdit(range, aTagTexts.join("\n"));
				textEdits.push(textEdit);
			}
		}
		// copy(JSON.stringify(textEdits[0].newText))
		return textEdits;
	}

	private static _modifyIndentationLevel(currentTag: ITag, indentationLevel: number, beforeTagGeneration: boolean) {
		if (beforeTagGeneration && currentTag.text.startsWith("</")) {
			indentationLevel--;
		} else if (!beforeTagGeneration && currentTag.text.startsWith("<") && !currentTag.text.endsWith("/>") && !currentTag.text.startsWith("</")) {
			indentationLevel++;
		}

		return indentationLevel;
	}

	private static _getIndentation(indentationLevel: number) {
		const indentationChar = "\t";
		let indentation = "";

		for (let i = 0; i < indentationLevel; i++) {
			indentation += indentationChar;
		}

		return indentation;
	}

	private static _getTagName(tag: string) {
		let i = 1; //first char is "<", that's why we start with second char
		while (!tag[i].match(/(\s|>|\n)/) && i < tag.length) {
			i++;
		}
		tag = tag.substring(1, i);
		if (tag.startsWith("/")) {
			tag = tag.substring(1, tag.length);
		}
		if (tag.endsWith("/")) {
			tag = tag.substring(0, tag.length - 1);
		}

		return tag;
	}

	private static _getTagAttributes(tag: string) {
		const tagAttributes = tag.match(/((?<=\s)(\w|:|\.)*(\s?)=(\s?)"(\s|.)*?")|((?<=\s)(\w|:|\.)*(\s?)=(\s?)'(\s|.)*?')/g) || [];

		return tagAttributes;
	}


	private static _getAllTags(document: IXMLFile) {
		let i = 0;
		const tags: ITag[] = [];
		const allStringsAreClosed = this._getIfAllStringsAreClosed(document.content);

		if (allStringsAreClosed) {
			while (i < document.content.length) {
				const thisIsTagEnd =
					document.content[i] === ">" &&
					!XMLParser.getIfPositionIsInString(document, i) &&
					(
						XMLParser.getIfPositionIsNotInComments(document.content, i) ||
						document.content.substring(i - 2, i + 1) === "-->"
					)
					;
				if (thisIsTagEnd) {
					const indexOfTagBegining = this._getTagBeginingIndex(document.content, i);
					tags.push({
						text: document.content.substring(indexOfTagBegining, i + 1),
						positionBegin: indexOfTagBegining,
						positionEnd: i
					});
				}
				i++;
			}
		}

		return tags;
	}

	private static _getIfAllStringsAreClosed(document: string) {
		let quotionMarkCount = 0;
		let secondTypeQuotionMarkCount = 0;

		let i = 0;
		while (i < document.length) {
			if (document[i] === "\"") {
				quotionMarkCount++;
			}
			if (document[i] === "'") {
				secondTypeQuotionMarkCount++;
			}
			i++;
		}

		return quotionMarkCount % 2 === 0 && secondTypeQuotionMarkCount % 2 === 0;
	}

	private static _getTagBeginingIndex(document: string, position: number) {
		let i = position;
		let shouldStop = i < 0;
		let isThisTagBegining =
			document[i] === "<" &&
			(
				XMLParser.getIfPositionIsNotInComments(document, i) ||
				document.substring(i, i + 4) === "<!--"
			);
		shouldStop ||= isThisTagBegining;

		while (!shouldStop) {
			i--;

			shouldStop = i < 0;
			isThisTagBegining =
				document[i] === "<" &&
				(
					XMLParser.getIfPositionIsNotInComments(document, i) ||
					document.substring(i, i + 4) === "<!--"
				);
			shouldStop ||= isThisTagBegining;
		}

		return i;
	}

}