import * as vscode from "vscode";
import { Tag } from "../xmllinter/parts/abstraction/Linter";
import { XMLParser } from "./XMLParser";

export class XMLFormatter {
	static formatDocument(document: vscode.TextDocument) {
		const textEdits: vscode.TextEdit[] = [];
		const documentText = document.getText();
		const allTags = this.getAllTags(documentText);

		let indentationLevel = 0;
		const aTagTexts = allTags.map(currentTag => {
			if (currentTag.text.startsWith("<!--")) {
				const indentation = this.getIndentation(indentationLevel);
				return `${indentation}${currentTag.text}`;
			} else {
				const tagName = this.getTagName(currentTag.text);
				const tagAttributes = this.getTagAttributes(currentTag.text);
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

				indentationLevel = this.modifyIndentationLevel(currentTag, indentationLevel, true);
				let indentation = this.getIndentation(indentationLevel);

				let newTag = `${indentation}${tagBegin}${tagName}\n`;
				newTag += tagAttributes.reduce((accumulator, tagAttribute) => {
					accumulator += `${indentation}\t${tagAttribute}\n`;

					return accumulator;
				}, "");
				if (tagAttributes.length === 0) {
					newTag = newTag.trimRight();
					indentation = "";
				}
				newTag += `${indentation}${tagEnd}`;

				indentationLevel = this.modifyIndentationLevel(currentTag, indentationLevel, false);

				return newTag;
			}
		});

		const positionBegin = document.positionAt(0);
		const positionEnd = document.positionAt(documentText.length);
		const range = new vscode.Range(positionBegin, positionEnd);
		const textEdit = new vscode.TextEdit(range, aTagTexts.join("\n"));
		textEdits.push(textEdit);

		return textEdits;
	}

	private static modifyIndentationLevel(currentTag: Tag, indentationLevel: number, beforeTagGeneration: boolean) {
		if (beforeTagGeneration && currentTag.text.startsWith("</")) {
			indentationLevel--;
		} else if (!beforeTagGeneration && currentTag.text.startsWith("<" ) && !currentTag.text.endsWith("/>") && !currentTag.text.startsWith("</")) {
			indentationLevel++;
		}

		return indentationLevel;
	}

	private static getIndentation(indentationLevel: number) {
		const indentationChar = "\t";
		let indentation = "";

		for (let i = 0; i < indentationLevel; i++) {
			indentation += indentationChar;
		}

		return indentation;
	}

	private static getTagName(tag: string) {
		let i = 1; //first char is "<", that's why we start with second char
		while ((!tag[i].match(/(\s|>|\n)/)) && i < tag.length) {
			i++;
		}
		tag = tag.substring(1, i);
		if (tag.startsWith("/")) {
			tag = tag.substring(1, tag.length);
		}

		return tag;
	}

	private static getTagAttributes(tag: string) {
		const tagAttributes = tag.match(/(?<=\s)(\w|:)*(\s?)=(\s?)"(\s|.)*?"/g) || [];

		return tagAttributes;
	}


	private static getAllTags(document: string) {
		let i = 0;
		const tags: Tag[] = [];

		while (i < document.length) {
			const thisIsTagEnd =
				document[i] === ">" &&
				!XMLParser.getIfPositionIsInString(document, i) &&
				(
					XMLParser.getIfPositionIsNotInComments(document, i) ||
					document.substring(i - 2, i + 1) === "-->"
				)
			;
			if (thisIsTagEnd) {
				const indexOfTagBegining = this.getTagBeginingIndex(document, i);
				tags.push({
					text: document.substring(indexOfTagBegining, i + 1),
					positionBegin: indexOfTagBegining,
					positionEnd: i
				});
			}
			i++;
		}

		return tags;
	}

	private static getTagBeginingIndex(document: string, position: number) {
		let i = position;
		let shouldStop = i < 0;
		let isThisTagBegining =
			document[i] === "<" &&
			(
				XMLParser.getIfPositionIsNotInComments(document, i) ||
				document.substring(i, i + 4) === "<!--"
			);
		shouldStop ||= isThisTagBegining;

		while(!shouldStop) {
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