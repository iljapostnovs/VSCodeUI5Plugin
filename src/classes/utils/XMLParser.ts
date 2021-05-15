import * as vscode from "vscode";
import { FileReader, IXMLFile } from "./FileReader";
import { IUIMethod } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { ITag } from "../providers/diagnostics/xml/xmllinter/parts/abstraction/Linter";

export enum PositionType {
	InTheTagAttributes = "1",
	Content = "2",
	InTheString = "3",
	InTheClassName = "4",
	InComments = "5",
	InBodyOfTheClass = "6"
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface IXMLDocumentIdData {
	id: string,
	className: string,
	tagText: string
}

export class XMLParser {
	static getXMLFunctionCallTagsAndAttributes(viewOrFragment: IXMLFile, eventHandlerName: string, functionCallClassName?: string) {
		const tagAndAttributes: { tag: ITag, attributes: string[] }[] = [];
		const positions = this.getPositionsOfFunctionCallInXMLText(eventHandlerName, viewOrFragment.content);
		if (positions.length > 0) {
			positions.forEach(position => {
				const tag = this.getTagInPosition(viewOrFragment, position);
				const attributes = this.getAttributesOfTheTag(tag);
				const eventHandlerAttributes = attributes?.filter(attribute => {
					const { attributeValue } = this.getAttributeNameAndValue(attribute);
					let currentEventHandlerName = this.getEventHandlerNameFromAttributeValue(attributeValue);

					if (currentEventHandlerName !== eventHandlerName && currentEventHandlerName.includes(eventHandlerName)) {
						const results = new RegExp(`((\\..*?\\.)|("))${eventHandlerName}("|')`).exec(currentEventHandlerName);
						if (results && results[0].split(".").length > 2) {
							const result = results[0].substring(0, results[0].length - 1).split(".").slice(1);
							if (functionCallClassName) {
								const handlerField = result[0];
								const responsibleClassName = FileReader.getResponsibleClassNameForViewOrFragment(viewOrFragment);
								if (responsibleClassName) {
									const fields = UIClassFactory.getClassFields(responsibleClassName);
									const field = fields.find(field => field.name === handlerField);
									if (field && field.type && !UIClassFactory.isClassAChildOfClassB(field.type, functionCallClassName)) {
										return false;
									}
								}
							}
							currentEventHandlerName = result[1];
						} else {
							currentEventHandlerName = eventHandlerName;
						}
					}

					return currentEventHandlerName === eventHandlerName;
				});
				if (eventHandlerAttributes && eventHandlerAttributes.length > 0) {
					tagAndAttributes.push({ tag, attributes: eventHandlerAttributes });
				}
			})
		}

		return tagAndAttributes;
	}

	static getAllIDsInCurrentView(XMLFile: IXMLFile) {
		const result: IXMLDocumentIdData[] = [];

		const allTags = this.getAllTags(XMLFile);
		allTags.forEach(tag => {
			const idAttribute = this.getAttributesOfTheTag(tag)?.find(attribute => this.getAttributeNameAndValue(attribute).attributeName === "id");
			if (idAttribute) {
				const className = this.getClassNameInPosition(XMLFile, tag.positionBegin + 1);

				result.push({
					className: className,
					id: this.getAttributeNameAndValue(idAttribute).attributeValue,
					tagText: tag.text
				});
			}

		});

		return result;
	}
	static getLibraryNameInPosition(XMLFile: IXMLFile, currentPosition: number) {
		const currentTagText = this.getTagInPosition(XMLFile, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPosition);

		if (!libraryPath) {
			const error = new Error(`xmlns:${tagPrefix} is not defined`);
			error.name = "LibraryPathException";
			throw error;
		}

		return libraryPath;
	}

	static getClassNameInPosition(XMLFile: IXMLFile, currentPosition: number) {
		let currentPositionClass = "";
		const currentTagText = this.getTagInPosition(XMLFile, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const className = this.getClassNameFromTag(currentTagText);
		if (className) {
			const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPosition);
			if (libraryPath) {
				currentPositionClass = [libraryPath, className].join(".");
			}
		}

		return currentPositionClass;
	}

	static getParentTagAtPosition(XMLFile: IXMLFile, position: number, closedTags: string[] = []) {
		let parentTag: ITag = {
			positionBegin: 0,
			positionEnd: 0,
			text: ""
		};
		const XMLText = XMLFile.content;

		if (XMLText && position) {
			const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLFile, position);
			const tag = this.getTagInPosition(XMLFile, position);
			const croppedTag = tag.text.substring(1, tag.text.length - 1); // remove < >
			const tagIsSelfClosed = croppedTag.endsWith("/");
			const itIsClosureTag = croppedTag.startsWith("/");
			if (tagIsSelfClosed) {
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else if (itIsClosureTag) {
				closedTags.push(croppedTag.substring(1, croppedTag.length));
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else if (closedTags.length > 0) {
				closedTags.pop();
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else {
				const className = this.getClassNameFromTag(tag.text);
				if (closedTags.includes(className)) {
					closedTags.splice(closedTags.indexOf(className), 1);
					parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
				} else {
					parentTag.positionBegin = positionBegin;
					parentTag.positionEnd = positionEnd;
					parentTag.text = tag.text;
				}

			}
		}

		return parentTag;
	}

	public static getTagInPosition(XMLFile: IXMLFile, position: number) {
		const XMLText = XMLFile.content;
		const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLFile, position);
		const tagText = XMLText.substring(positionBegin, positionEnd);
		const tag: ITag = {
			text: tagText,
			positionBegin: positionBegin,
			positionEnd: positionEnd
		};

		return tag;
	}

	public static getTagBeginEndPosition(XMLFile: IXMLFile, position: number) {
		let i = position;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;

		const XMLText = XMLFile.content;
		while (i > 0 && (XMLText[i] !== "<" || !this.getIfPositionIsNotInComments(XMLText, i) || this.getIfPositionIsInString(XMLFile, i))) {
			i--;
		}
		tagPositionBegin = i;

		while (i < XMLText.length && (XMLText[i] !== ">" || !this.getIfPositionIsNotInComments(XMLText, i) || this.getIfPositionIsInString(XMLFile, i))) {
			i++;
		}
		tagPositionEnd = i + 1;

		return {
			positionBegin: tagPositionBegin,
			positionEnd: tagPositionEnd
		};
	}

	private static _lastDocument = "";
	private static _lastComments: RegExpExecArray[] = [];

	public static getIfPositionIsNotInComments(document: string, position: number) {
		let isPositionNotInComments = true;
		let comments: RegExpExecArray[] = [];

		if (this._lastDocument.length !== document.length) {
			const regExp = new RegExp("<!--(.|\\s)*?-->", "g");

			let result = regExp.exec(document);
			while (result) {
				comments.push(result);
				result = regExp.exec(document);
			}

			this._lastComments = comments;
			this._lastDocument = document;
		} else {
			comments = this._lastComments;
		}

		const comment = comments.find(comment => comment.index <= position && comment.index + comment[0].length > position);

		isPositionNotInComments = !comment;

		return isPositionNotInComments;
	}

	static getIfPositionIsInString(XMLFile: IXMLFile, position: number) {
		const XMLText = XMLFile.content;
		let isInString = false;

		if (!XMLFile.XMLParserData) {
			this._fillXMLParsedData(XMLFile);
		}

		if (XMLFile.XMLParserData?.strings) {
			isInString = !!XMLFile.XMLParserData.strings[position];
		} else {
			let quotionMarkCount = 0;
			let secondTypeQuotionMarkCount = 0;

			let i = 0;
			while (i < position) {
				if (XMLText[i] === "\"") {
					quotionMarkCount++;
				}
				if (XMLText[i] === "'") {
					secondTypeQuotionMarkCount++;
				}

				i++;
			}

			isInString = quotionMarkCount % 2 === 1 || secondTypeQuotionMarkCount % 2 === 1;
		}

		return isInString;
	}

	static getTagPrefix(tagText: string) {
		let tagPrefix = "";

		let i = 0;

		while (i < tagText.length && !/\s|>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			tagPrefix = tagNameParts[0];
		}

		if (tagPrefix.startsWith("/")) {
			tagPrefix = tagPrefix.substring(1, tagPrefix.length);
		}

		return tagPrefix;
	}

	static getFullClassNameFromTag(tag: ITag, XMLFile: IXMLFile) {
		let className = this.getClassNameFromTag(tag.text);
		const classTagPrefix = this.getTagPrefix(tag.text);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, classTagPrefix, tag.positionEnd);
		if (libraryPath) {
			className = [libraryPath, className].join(".");
		} else {
			className = "";
		}

		return className;
	}

	static getClassNameFromTag(tagText: string) {
		let className = "";

		let i = 0;

		while (i < tagText.length && !/\s|>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			className = tagNameParts[1];
		} else {
			className = tagNameParts[0];
		}

		if (className.endsWith("/")) {
			className = className.substring(0, className.length - 1);
		}
		if (className.startsWith("/")) {
			className = className.substring(1, className.length);
		}

		return className;
	}

	static getLibraryPathFromTagPrefix(XMLFile: IXMLFile, tagPrefix: string, position: number) {
		let libraryPath;
		let regExpBase;
		let delta = 0;
		const XMLText = XMLFile.content;
		const results = XMLFile.XMLParserData?.prefixResults[tagPrefix] || [];
		const tagPositionEnd = this.getTagBeginEndPosition(XMLFile, position).positionEnd;

		if (results.length === 0) {
			if (!tagPrefix) {
				regExpBase = "(?<=xmlns\\s?=\\s?\").*?(?=\")";
			} else {
				regExpBase = `(?<=xmlns(:${tagPrefix})\\s?=\\s?").*?(?=")`;
			}
			const rClassName = new RegExp(regExpBase, "g");

			let classNameResult = rClassName.exec(XMLText);

			while (classNameResult) {
				results.push({
					result: classNameResult[0],
					position: classNameResult.index
				});

				classNameResult = rClassName.exec(XMLText);
				if (results.find(result => result.position === classNameResult?.index)) {
					classNameResult = null;
				}
			}

			if (!XMLFile.XMLParserData) {
				this._fillXMLParsedData(XMLFile);
			}
			if (XMLFile.XMLParserData) {
				XMLFile.XMLParserData.prefixResults[tagPrefix] = results;
			}
		}

		if (results.length > 0) {
			//needed for in-tag xmlns declaration
			//TODO: Make it hierarchical
			delta = Math.abs(position - results[0].position);
			let closestResult = results[0];
			results.forEach(result => {
				const currentDelta = Math.abs(position - result.position);

				if (currentDelta < delta && result.position < tagPositionEnd) {
					libraryPath = result.result;

					delta = currentDelta;
					closestResult = result;
				}
			});

			if (closestResult) {
				libraryPath = closestResult.result;
			}
		}

		return libraryPath;
	}

	static getPositionType(XMLFile: IXMLFile, currentPosition: number) {
		let i = currentPosition;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;
		let positionType: PositionType = PositionType.Content;
		// let positionInString = false; TODO: this

		const XMLText = XMLFile.content;
		if (this.getIfPositionIsInString(XMLFile, currentPosition)) {
			positionType = PositionType.InTheString;
		} else {
			while (i > 0 && XMLText[i] !== "<") {
				i--;
			}
			tagPositionBegin = i;

			while (i < XMLText.length && (XMLText[i] !== ">" || this.getIfPositionIsInString(XMLFile, i))) {
				i++;
			}
			tagPositionEnd = i + 1;

			const positionIsInsideTheClassTag = currentPosition > tagPositionBegin && currentPosition < tagPositionEnd;
			const tagText = XMLText.substring(tagPositionBegin, currentPosition);
			const positionInTheAttributes = /\s/.test(tagText);

			if (positionIsInsideTheClassTag && positionInTheAttributes) {
				positionType = PositionType.InTheTagAttributes;
			} else if (positionIsInsideTheClassTag) {
				positionType = PositionType.InTheClassName;
			} else {
				positionType = PositionType.InBodyOfTheClass;
			}
		}

		return positionType;
	}

	static getPositionBeforeStringBegining(XMLViewText: string, currentPosition: number) {
		let i = currentPosition - 1;
		while (XMLViewText[i] !== "\"" && i > 0) {
			i--;
		}
		i--;

		return i;
	}

	static getNearestAttribute(XMLViewText: string, currentPosition: number) {
		let i = currentPosition;

		while (!/\s/.test(XMLViewText[i]) && i > 0) {
			i--;
		}

		return XMLViewText.substring(i + 1, currentPosition).replace("=", "");
	}

	static getMethodsOfTheControl(controllerName = this.getControllerNameOfTheCurrentDocument()) {
		let classMethods: IUIMethod[] = [];

		if (controllerName) {
			classMethods = this._getClassMethodsRecursively(controllerName);
		}

		return classMethods;
	}

	static getControllerNameOfTheCurrentDocument() {
		let controllerName;
		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && currentDocument.fileName.endsWith(".view.xml")) {
			const currentDocumentText = currentDocument.getText();
			controllerName = FileReader.getControllerNameFromView(currentDocumentText);
		}

		return controllerName;
	}

	private static _getClassMethodsRecursively(className: string, onlyCustomMethods = true) {
		let methods: IUIMethod[] = [];
		const UIClass = UIClassFactory.getUIClass(className);
		methods = UIClass.methods;

		const isThisClassFromAProject = !!FileReader.getManifestForClass(UIClass.parentClassNameDotNotation);
		if (UIClass.parentClassNameDotNotation && (!onlyCustomMethods || isThisClassFromAProject)) {
			methods = methods.concat(this._getClassMethodsRecursively(UIClass.parentClassNameDotNotation));
		}

		return methods;
	}

	static getPrefixForLibraryName(libraryName: string, document: string) {
		let prefix: string | undefined;
		const regExp = new RegExp(`(?<=xmlns)(\\w|:)*?(?=="${escapeRegExp(libraryName)}")`);
		const result = regExp.exec(document);
		if (result) {
			prefix = result[0].replace(":", "");
		}

		return prefix;
	}

	public static getAllTags(XMLFile: IXMLFile) {
		const XMLText = XMLFile.content;
		if (XMLFile.XMLParserData && XMLFile.XMLParserData.tags.length > 0) {
			return XMLFile.XMLParserData?.tags;
		} else if (XMLFile.XMLParserData && !XMLFile.XMLParserData.areAllStringsClosed) {
			return [];
		}

		let i = 0;
		const tags: ITag[] = [];

		while (i < XMLText.length) {
			const thisIsTagEnd = XMLText[i] === ">" && !XMLParser.getIfPositionIsInString(XMLFile, i);
			if (thisIsTagEnd) {
				const indexOfTagBegining = this._getTagBeginingIndex(XMLFile, i);
				tags.push({
					text: XMLText.substring(indexOfTagBegining, i + 1),
					positionBegin: indexOfTagBegining,
					positionEnd: i
				});
			}
			i++;
		}

		if (!XMLFile.XMLParserData) {
			this._fillXMLParsedData(XMLFile);
		}
		if (XMLFile.XMLParserData) {
			XMLFile.XMLParserData.tags = tags;
		}

		return tags;
	}

	private static _fillXMLParsedData(XMLFile: IXMLFile) {
		XMLFile.XMLParserData = {
			areAllStringsClosed: false,
			prefixResults: {},
			tags: [],
			strings: []
		};
		const stringData = this.getStringPositionMapping(XMLFile.content);
		XMLFile.XMLParserData.strings = stringData.positionMapping;
		XMLFile.XMLParserData.areAllStringsClosed = stringData.areAllStringsClosed;
	}

	public static setCurrentDocument() {
		// const className = FileReader.getClassNameFromPath(XMLFile.fsPath);
		// if (className) {
		// 	const xmlType = className?.endsWith(".fragment.xml") ? "fragment" : "view";
		// 	const XMLFile: IXMLParserCacheable | undefined = FileReader.getXMLFile(className, xmlType);
		// 	if (XMLFile) {
		// 		// XMLFile.areAllStringsClosed
		// 	}
		// }
	}

	// public static setCurrentDocument(document: string | undefined) {
	// 	if (!document) {
	// 		this._currentDocument.isMarkedAsUndefined = true;
	// 	} else {
	// 		if (document !== this._currentDocument.document) {
	// 			this._currentDocument.document = document;
	// 			const stringData = this._getStringPositionMapping(document);
	// 			this._currentDocument.strings = stringData.positionMapping;
	// 			this._currentDocument.areAllStringsClosed = stringData.areAllStringsClosed;
	// 			this._currentDocument.tags = [];
	// 			this._currentDocument.prefixResults = {};
	// 		}
	// 		this._currentDocument.isMarkedAsUndefined = false;
	// 	}
	// }

	static getStringPositionMapping(document: string) {
		const positionMapping: boolean[] = [];
		let quotionMarkCount = 0;
		let secondTypeQuotionMarkCount = 0;

		let i = 0;
		while (i < document.length) {
			const isInString = quotionMarkCount % 2 === 1 || secondTypeQuotionMarkCount % 2 === 1;
			positionMapping.push(isInString);
			if (document[i] === "\"") {
				quotionMarkCount++;
			}
			if (document[i] === "'") {
				secondTypeQuotionMarkCount++;
			}
			i++;
		}

		return {
			positionMapping: positionMapping,
			areAllStringsClosed: quotionMarkCount % 2 === 0 && secondTypeQuotionMarkCount % 2 === 0
		};
	}

	private static _getTagBeginingIndex(XMLFile: IXMLFile, position: number) {
		let i = position;
		const XMLText = XMLFile.content;

		while (i > 0 && (XMLText[i] !== "<" || XMLParser.getIfPositionIsInString(XMLFile, i))) {
			i--;
		}

		return i;
	}

	public static getAttributesOfTheTag(tag: ITag | string) {
		const tagOfTagInterface = tag as ITag;
		const tagAsString = tag as string;

		let text = "";
		if (tagOfTagInterface.text) {
			text = tagOfTagInterface.text;
		} else {
			text = tagAsString;
		}

		return text.match(/(?<=\s)(\w|:)*(\s?)=(\s?)"(\s|.)*?"/g);
	}
	public static getAttributeNameAndValue(attribute: string) {
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		let attributeValue = attribute.replace(attributeName, "").replace("=", "").trim();
		attributeValue = attributeValue.substring(1, attributeValue.length - 1); // removes ""

		return {
			attributeName: attributeName,
			attributeValue: attributeValue
		};
	}

	public static getPositionsOfFunctionCallInXMLText(functionCallName: string, XMLText: string) {
		const positions: number[] = [];

		const regExpString = `\\.?${functionCallName}("|')`;
		const regex = new RegExp(regExpString, "g");
		let result = regex.exec(XMLText);
		while (result) {
			positions.push(result.index);
			result = regex.exec(XMLText);
		}

		return positions;
	}

	public static getEventHandlerNameFromAttributeValue(attributeValue: string) {
		let eventName = attributeValue;

		if (eventName.startsWith(".")) {
			eventName = eventName.replace(".", "");
		}
		if (eventName.includes("(")) {
			const result = /.*(?=\(.*\))/.exec(eventName);
			if (result) {
				eventName = result[0];
			}
		}

		return eventName;
	}

}