import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../ui5parser/ParserBearer";

export class XMLFormatter extends ParserBearer {
	formatDocument(document: vscode.TextDocument) {
		const textEdits: vscode.TextEdit[] = [];
		const documentText = document.getText();

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document), true);
		if (XMLFile) {
			const allTags = this._getAllTags(XMLFile);

			if (allTags.length > 0) {
				let indentationLevel = 0;
				const formattedTags = allTags
					.map(currentTag => {
						const isComment = currentTag.text.startsWith("<!--");
						const isDocTypeTag = currentTag.text.startsWith("<!");
						if (isComment || isDocTypeTag) {
							const indentation = this._getIndentation(indentationLevel);
							return `${indentation}${currentTag.text}`;
						} else {
							let formattedTag;
							({ formattedTag, indentationLevel } = this._formatNonCommentTag(
								currentTag,
								indentationLevel
							));
							return formattedTag;
						}
					})
					.reduce(this._removeUnnecessaryTags.bind(this), []);

				const positionBegin = document.positionAt(0);
				const positionEnd = document.positionAt(documentText.length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const textEdit = new vscode.TextEdit(range, formattedTags.join("\n"));
				textEdits.push(textEdit);
			}
		}
		// copy(JSON.stringify(textEdits[0].newText))
		return textEdits;
	}

	private _removeUnnecessaryTags(accumulator: string[], currentTag: string): string[] {
		//<Button></Button> -> <Button/>
		const lastTagInAccumulator = accumulator[accumulator.length - 1];
		const lastTagIsAnOpener =
			lastTagInAccumulator &&
			!lastTagInAccumulator.trim().startsWith("</") &&
			!lastTagInAccumulator.trim().endsWith("/>");
		if (lastTagIsAnOpener) {
			const lastTagName = this._parser.xmlParser.getClassNameFromTag(lastTagInAccumulator.trim());
			const currentTagName = this._parser.xmlParser.getClassNameFromTag(currentTag.trim());
			const bothTagsAreSameClass = lastTagName && currentTagName && lastTagName === currentTagName;
			const previousTagIsAClass = lastTagName && lastTagName[0] === lastTagName[0].toUpperCase();
			const currentTagIsClosure = currentTag.trim().startsWith("</");
			const lastTagIsNotSelfClosed = !lastTagInAccumulator.trim().endsWith("/>");
			const nextTagClosesCurrentOne =
				previousTagIsAClass && bothTagsAreSameClass && currentTagIsClosure && lastTagIsNotSelfClosed;

			if (nextTagClosesCurrentOne) {
				accumulator[accumulator.length - 1] = `${lastTagInAccumulator.substring(
					0,
					lastTagInAccumulator.length - 1
				)}/>`;
			} else {
				accumulator.push(currentTag);
			}
		} else {
			accumulator.push(currentTag);
		}

		return accumulator;
	}

	private _formatNonCommentTag(currentTag: ITag, indentationLevel: number) {
		const tagName = this._getTagName(currentTag.text);
		const tagAttributes = this._getTagAttributes(currentTag.text).map(tag => tag.toString());
		let endSubstraction = 1;
		if (currentTag.text.endsWith("/>")) {
			endSubstraction = 2;
		}
		const tagEnd = currentTag.text.substring(currentTag.text.length - endSubstraction, currentTag.text.length);

		let beginAddition = 1;
		if (currentTag.text.startsWith("</")) {
			beginAddition = 2;
		}
		const tagBegin = currentTag.text.substring(0, beginAddition);

		indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, true);
		let indentation = this._getIndentation(indentationLevel);

		let formattedTag = `${indentation}${tagBegin}${tagName}\n`;

		if (tagAttributes.length === 1) {
			formattedTag = formattedTag.trimEnd();
		}
		formattedTag += tagAttributes.reduce((accumulator, tagAttribute) => {
			const tagData = this._parser.xmlParser.getAttributeNameAndValue(tagAttribute);
			const attributeValueIndentation = tagAttributes.length === 1 ? indentation : indentation + "\t";
			const formattedAttributeValue = this._formatAttributeValue(
				tagData.attributeValue,
				attributeValueIndentation
			);
			accumulator += `${indentation}\t${tagData.attributeName}=${formattedAttributeValue}\n`;
			if (tagAttributes.length === 1) {
				accumulator = ` ${accumulator.trimStart()}`;
			}
			return accumulator;
		}, "");

		const bShouldTagEndingBeOnNewline = vscode.workspace
			.getConfiguration("ui5.plugin")
			.get("xmlFormatterTagEndingNewline") as boolean;

		if (tagAttributes.length <= 1 || !bShouldTagEndingBeOnNewline) {
			formattedTag = formattedTag.trimEnd();
			indentation = "";
		}

		formattedTag += `${indentation}${tagEnd}`;

		indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, false);
		return { formattedTag, indentationLevel };
	}

	private _formatAttributeValue(attributeValue: string, indentation: string) {
		let formattedValue = "";
		if (!attributeValue.startsWith("\\")) {
			let i = 0;
			while (i < attributeValue.length) {
				const currentChar = attributeValue[i];
				if (this._charIsInString(i, attributeValue)) {
					formattedValue += currentChar;
				} else if (currentChar === "(") {
					const nextChar = attributeValue[i + 1];
					if (nextChar !== "{") {
						indentation += "\t";
					}
					const nextLine = nextChar === "(" ? `\n${indentation}\t` : "";
					formattedValue += `${currentChar}${nextLine}`;
				} else if (currentChar === ")") {
					const lastFormattedValueChar = formattedValue[formattedValue.length - 1];
					indentation = indentation.substring(0, indentation.length - 1);
					const nextChar = attributeValue[i + 1];
					const nextLine = !["\n", "\r", " ", undefined].includes(nextChar) ? `\n${indentation}\t` : "";
					formattedValue =
						lastFormattedValueChar === "\t"
							? formattedValue.substring(0, formattedValue.length - 1)
							: formattedValue;
					formattedValue += `${currentChar}${nextLine}`;
				} else if (currentChar === "{") {
					const positionEnd = this._getPositionOfObjectEnd(attributeValue, i);
					const currentBindingValue = attributeValue.substring(i, positionEnd);
					try {
						const evaluatedValue = eval(`(${currentBindingValue})`);
						if (typeof evaluatedValue === "object") {
							const necessaryIndentation =
								this._getCurvyBracketsCount(attributeValue, i + 1) === 1
									? indentation
									: indentation + "\t";
							const formattedBinding = this._formatAttributeObject(evaluatedValue, necessaryIndentation);
							formattedValue += formattedBinding;
						}
						i = positionEnd - 1;
					} catch (error) {
						formattedValue += currentChar;
					}
				} else if (currentChar === "\n") {
					const positionEnd = this._getPositionOfIndentationEnd(attributeValue, i);
					const necessaryIndentation = attributeValue[positionEnd] === "}" ? indentation : indentation + "\t";
					formattedValue += "\n" + necessaryIndentation;
					i = positionEnd - 1;
				} else {
					formattedValue += currentChar;
				}

				i++;
			}
			formattedValue = `"${formattedValue}"`;
		} else {
			formattedValue = `'${attributeValue}'`;
		}

		return formattedValue;
	}
	private _charIsInString(index: number, attributeValue: string) {
		let i = 0;
		let quotesQuantity = 0;
		while (i < index) {
			if (attributeValue[i] === "'") quotesQuantity++;
			i++;
		}

		return quotesQuantity % 2 === 1;
	}

	private _getCurvyBracketsCount(attributeValue: string, positionAt: number) {
		let curvedBracketsCount = 0;
		let i = 0;
		while (i < attributeValue.length && i < positionAt) {
			if (attributeValue[i] === "{") {
				curvedBracketsCount++;
			} else if (attributeValue[i] === "}") {
				curvedBracketsCount--;
			}
			i++;
		}
		return curvedBracketsCount;
	}

	private _getPositionOfObjectEnd(attributeValue: string, i: number) {
		let curvedBracketsCount = 1;
		i++;
		while (i < attributeValue.length && curvedBracketsCount !== 0) {
			if (attributeValue[i] === "{") {
				curvedBracketsCount++;
			} else if (attributeValue[i] === "}") {
				curvedBracketsCount--;
			}
			i++;
		}
		return i;
	}

	private _getPositionOfIndentationEnd(attributeValue: string, i: number) {
		i++;
		while (i < attributeValue.length && /\s/.test(attributeValue[i])) {
			i++;
		}
		return i;
	}

	private _formatAttributeObject(anyObject: any, indentation: string) {
		let formattedAttribute = "{\n";

		const keys = Object.keys(anyObject);
		keys.forEach(key => {
			const value = anyObject[key];
			formattedAttribute += `${indentation}\t${key}: `;
			formattedAttribute += this._formatAttributeValuePart(value, indentation);
			const isLastKey = keys.indexOf(key) === keys.length - 1;
			if (!isLastKey) {
				formattedAttribute += ",";
			}
			formattedAttribute += "\n";
		});

		formattedAttribute += `${indentation}}`;

		return formattedAttribute;
	}

	private _formatAttributeValuePart(value: any, indentation: string) {
		let formattedAttribute = "";
		if (Array.isArray(value)) {
			const arrayString =
				"[" + value.map(value => `${this._formatAttributeValuePart(value, indentation)}`).join(", ") + "]";
			formattedAttribute += `${arrayString}`;
		} else if (typeof value === "object") {
			formattedAttribute += `${this._formatAttributeObject(value, indentation + "\t")}`;
		} else if (typeof value === "string") {
			formattedAttribute += `'${value.replace(/\\/g, "\\\\")}'`;
		} else if (typeof value === "function") {
			throw new Error("Parsing error");
		} else {
			formattedAttribute += `${value}`;
		}
		return formattedAttribute;
	}

	private _modifyIndentationLevel(currentTag: ITag, indentationLevel: number, beforeTagGeneration: boolean) {
		if (beforeTagGeneration && currentTag.text.startsWith("</")) {
			indentationLevel--;
		} else if (
			!beforeTagGeneration &&
			currentTag.text.startsWith("<") &&
			!currentTag.text.endsWith("/>") &&
			!currentTag.text.startsWith("</")
		) {
			indentationLevel++;
		}

		return indentationLevel;
	}

	private _getIndentation(indentationLevel: number) {
		const indentationChar = "\t";
		let indentation = "";

		for (let i = 0; i < indentationLevel; i++) {
			indentation += indentationChar;
		}

		return indentation;
	}

	private _getTagName(tag: string) {
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

	private _getTagAttributes(tag: string) {
		const tagAttributes =
			tag.match(/((?<=\s)(\w|:|\.)*(\s?)=(\s?)"(\s|.)*?")|((?<=\s)(\w|:|\.)*(\s?)=(\s?)'(\s|.)*?')/g) || [];

		return tagAttributes;
	}

	private _getAllTags(document: IXMLFile) {
		let i = 0;
		const tags: ITag[] = [];
		const allStringsAreClosed = this._getIfAllStringsAreClosed(document.content);

		if (allStringsAreClosed) {
			while (i < document.content.length) {
				const possiblyDocType = document.content.substring(i, i + 9).toLowerCase();
				const isDocType = possiblyDocType === "<!doctype";
				const thisIsTagEnd =
					document.content[i] === ">" &&
					!this._parser.xmlParser.getIfPositionIsInString(document, i) &&
					(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
						document.content.substring(i - 2, i + 1) === "-->");
				if (thisIsTagEnd) {
					const indexOfTagBegining = this._getTagBeginingIndex(document, i);
					tags.push({
						text: document.content.substring(indexOfTagBegining, i + 1),
						positionBegin: indexOfTagBegining,
						positionEnd: i
					});
				} else if (isDocType) {
					const doctypeTag = this._processDocType(document, i);
					tags.push(doctypeTag);
					i += doctypeTag.text.length;
				}
				i++;
			}
		}

		return tags;
	}
	private _processDocType(document: IXMLFile, i: number): ITag {
		const doctypeBeginIndex = i;
		let doctypeEndIndex = i;

		let tagOpeningCount = 0;
		let tagClosingCount = 0;
		while (doctypeEndIndex === doctypeBeginIndex && i < document.content.length) {
			if (
				!this._parser.xmlParser.getIfPositionIsInString(document, i) &&
				this._parser.xmlParser.getIfPositionIsNotInComments(document, i)
			) {
				if (document.content[i] === "<") {
					tagOpeningCount++;
				} else if (document.content[i] === ">") {
					tagClosingCount++;
				}
				if (tagOpeningCount === tagClosingCount) {
					doctypeEndIndex = i + 1;
				}
			}
			i++;
		}

		return {
			text: document.content.substring(doctypeBeginIndex, doctypeEndIndex),
			positionBegin: doctypeBeginIndex,
			positionEnd: doctypeEndIndex
		};
	}

	private _getIfAllStringsAreClosed(document: string) {
		let quotionMarkCount = 0;
		let secondTypeQuotionMarkCount = 0;

		let i = 0;
		while (i < document.length) {
			// eslint-disable-next-line @typescript-eslint/quotes
			if (document[i] === '"') {
				quotionMarkCount++;
			}
			if (document[i] === "'") {
				secondTypeQuotionMarkCount++;
			}
			i++;
		}

		return quotionMarkCount % 2 === 0 && secondTypeQuotionMarkCount % 2 === 0;
	}

	private _getTagBeginingIndex(document: IXMLFile, position: number) {
		let i = position;
		let shouldStop = i < 0;
		let isThisTagBegining =
			document.content[i] === "<" &&
			(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
				document.content.substring(i, i + 4) === "<!--");
		shouldStop ||= isThisTagBegining;

		while (!shouldStop) {
			i--;

			shouldStop = i < 0;
			isThisTagBegining =
				document.content[i] === "<" &&
				(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
					document.content.substring(i, i + 4) === "<!--");
			shouldStop ||= isThisTagBegining;
		}

		return i;
	}
}
