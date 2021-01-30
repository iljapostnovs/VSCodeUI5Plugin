import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { UIMethod } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { Tag } from "../providers/diagnostics/xml/xmllinter/parts/abstraction/Linter";

export enum PositionType {
	InTheTagAttributes = "1",
	Content = "2",
	InTheString = "3",
	InTheClassName = "4",
	InComments = "5",
	InBodyOfTheClass = "6"
}

interface PrefixResults {
	[key: string]: any[]
}
interface XMLDocumentData {
	document: string;
	strings: boolean[];
	tags: Tag[];
	prefixResults: PrefixResults;
	isMarkedAsUndefined: boolean;
	areAllStringsClosed: boolean;
}
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class XMLParser {
	static getAllIDsInCurrentView() {
		let IdsResult: string[] = [];
		const currentClass = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClass) {
			const idRegExp = /(?<=\sid=").*?(?="\s)/g;
			const view = FileReader.getViewForController(currentClass);
			if (view) {
				IdsResult = view.content.match(idRegExp) || [];
				view.fragments.forEach(fragment => {
					const IdsFragmentResult = fragment.content.match(idRegExp) || [];
					if (IdsFragmentResult) {
						IdsResult.push(...IdsFragmentResult);
					}
				});
			}
			const fragments = FileReader.getFragmentsForClass(currentClass);
			fragments.forEach(fragment => {
				const IdsFragmentResult = fragment.content.match(idRegExp) || [];
				if (IdsFragmentResult) {
					IdsResult.push(...IdsFragmentResult);
				}
			});
		}

		return IdsResult;
	}
	static getLibraryNameInPosition(XMLViewText: string, currentPosition: number) {
		const currentTagText = this.getTagInPosition(XMLViewText, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix, currentPosition);

		if (!libraryPath) {
			const error = new Error(`xmlns:${tagPrefix} is not defined`);
			error.name = "LibraryPathException";
			throw error;
		}

		return libraryPath;
	}
	static getClassNameInPosition(XMLViewText: string, currentPosition: number) {
		let currentPositionClass = "";
		const currentTagText = this.getTagInPosition(XMLViewText, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const className = this.getClassNameFromTag(currentTagText);
		if (className) {
			const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix, currentPosition);
			if (libraryPath) {
				currentPositionClass = [libraryPath, className].join(".");
			}
		}

		return currentPositionClass;
	}

	static getParentTagAtPosition(XMLText?: string, position?: number, closedTags: string[] = []) {
		let parentTag: Tag = {
			positionBegin: 0,
			positionEnd: 0,
			text: ""
		};
		if (!XMLText) {
			XMLText = vscode.window.activeTextEditor?.document.getText();
		}
		if (!position) {
			position = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);
		}

		if (XMLText && position) {
			const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLText, position);
			const tag = this.getTagInPosition(XMLText, position);
			const croppedTag = tag.text.substring(1, tag.text.length - 1); // remove < >
			const tagIsSelfClosed = croppedTag.endsWith("/");
			const itIsClosureTag = croppedTag.startsWith("/");
			if (tagIsSelfClosed) {
				parentTag = this.getParentTagAtPosition(XMLText, positionBegin - 1, closedTags);
			} else if (itIsClosureTag) {
				closedTags.push(croppedTag.substring(1, croppedTag.length));
				parentTag = this.getParentTagAtPosition(XMLText, positionBegin - 1, closedTags);
			} else if (closedTags.length > 0) {
				closedTags.pop();
				parentTag = this.getParentTagAtPosition(XMLText, positionBegin - 1, closedTags);
			} else {
				const className = this.getClassNameFromTag(tag.text);
				if (closedTags.includes(className)) {
					closedTags.splice(closedTags.indexOf(className), 1);
					parentTag = this.getParentTagAtPosition(XMLText, positionBegin - 1, closedTags);
				} else {
					parentTag.positionBegin = positionBegin;
					parentTag.positionEnd = positionEnd;
					parentTag.text = tag.text;
				}

			}
		}

		return parentTag;
	}

	public static getTagInPosition(XMLViewText: string, position: number) {
		const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLViewText, position);
		const tagText = XMLViewText.substring(positionBegin, positionEnd);
		const tag: Tag = {
			text: tagText,
			positionBegin: positionBegin,
			positionEnd: positionEnd
		};

		return tag;
	}

	public static getTagBeginEndPosition(XMLViewText: string, position: number) {
		let i = position;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;

		while (i > 0 && (XMLViewText[i] !== "<" || !this.getIfPositionIsNotInComments(XMLViewText, i) || this.getIfPositionIsInString(XMLViewText, i))) {
			i--;
		}
		tagPositionBegin = i;

		while (i < XMLViewText.length && (XMLViewText[i] !== ">" || !this.getIfPositionIsNotInComments(XMLViewText, i) || this.getIfPositionIsInString(XMLViewText, i))) {
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

	static getIfPositionIsInString(XMLViewText: string, position: number) {
		let isInString = false;
		const currentDocument = this._getCurrentDocument();
		if (currentDocument) {
			isInString = !!currentDocument.strings[position];
		} else {
			let quotionMarkCount = 0;
			let secondTypeQuotionMarkCount = 0;

			let i = 0;
			while (i < position) {
				if (XMLViewText[i] === "\"") {
					quotionMarkCount++;
				}
				if (XMLViewText[i] === "'") {
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

	static getFullClassNameFromTag(tag: Tag, XMLText: string) {
		let className = this.getClassNameFromTag(tag.text);
		const classTagPrefix = this.getTagPrefix(tag.text);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLText, classTagPrefix, tag.positionEnd);
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

	static getLibraryPathFromTagPrefix(XMLViewText: string, tagPrefix: string, position: number) {
		let libraryPath;
		let regExpBase;
		let delta = 0;
		const currentDocument = this._getCurrentDocument();
		const results = currentDocument?.prefixResults[tagPrefix] || [];
		const tagPositionEnd = this.getTagBeginEndPosition(XMLViewText, position).positionEnd;

		if (results.length === 0) {
			if (!tagPrefix) {
				regExpBase = "(?<=xmlns\\s?=\\s?\").*?(?=\")";
			} else {
				regExpBase = `(?<=xmlns(:${tagPrefix})\\s?=\\s?").*?(?=")`;
			}
			const rClassName = new RegExp(regExpBase, "g");

			let classNameResult = rClassName.exec(XMLViewText);

			while (classNameResult) {
				results.push({
					result: classNameResult[0],
					position: classNameResult.index
				});

				classNameResult = rClassName.exec(XMLViewText);
				if (results.find(result => result.position === classNameResult?.index)) {
					classNameResult = null;
				}
			}
			if (currentDocument) {
				currentDocument.prefixResults[tagPrefix] = results;
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

	static getPositionType(XMLViewText: string, currentPosition: number) {
		let i = currentPosition;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;
		let positionType: PositionType = PositionType.Content;
		// let positionInString = false; TODO: this

		if (this.getIfPositionIsInString(XMLViewText, currentPosition)) {
			positionType = PositionType.InTheString;
		} else {
			while (i > 0 && XMLViewText[i] !== "<") {
				i--;
			}
			tagPositionBegin = i;

			while (i < XMLViewText.length && (XMLViewText[i] !== ">" || this.getIfPositionIsInString(XMLViewText, i))) {
				i++;
			}
			tagPositionEnd = i + 1;

			const positionIsInsideTheClassTag = currentPosition > tagPositionBegin && currentPosition < tagPositionEnd;
			const tagText = XMLViewText.substring(tagPositionBegin, currentPosition);
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
		let classMethods: UIMethod[] = [];

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
		let methods: UIMethod[] = [];
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

	private static _currentDocument: XMLDocumentData = {
		document: "",
		strings: [],
		tags: [],
		prefixResults: {},
		isMarkedAsUndefined: true,
		areAllStringsClosed: true
	}

	public static getAllTags(document: string) {
		const currentDocument = this._getCurrentDocument();
		if (currentDocument && currentDocument.tags.length > 0) {
			return currentDocument.tags;
		} else if (currentDocument && !currentDocument.areAllStringsClosed) {
			return [];
		}

		let i = 0;
		const tags: Tag[] = [];

		while (i < document.length) {
			const thisIsTagEnd = document[i] === ">" && !XMLParser.getIfPositionIsInString(document, i);
			if (thisIsTagEnd) {
				const indexOfTagBegining = this._getTagBeginingIndex(document, i);
				tags.push({
					text: document.substring(indexOfTagBegining, i + 1),
					positionBegin: indexOfTagBegining,
					positionEnd: i
				});
			}
			i++;
		}

		if (currentDocument) {
			currentDocument.tags = tags;
		}

		return tags;
	}

	private static _getCurrentDocument() {
		const currentDocument = this._currentDocument.isMarkedAsUndefined ? undefined : this._currentDocument;
		return currentDocument;
	}

	public static setCurrentDocument(document: string | undefined) {
		if (!document) {
			this._currentDocument.isMarkedAsUndefined = true;
		} else {
			if (document !== this._currentDocument.document) {
				this._currentDocument.document = document;
				const stringData = this._getStringPositionMapping(document);
				this._currentDocument.strings = stringData.positionMapping;
				this._currentDocument.areAllStringsClosed = stringData.areAllStringsClosed;
				this._currentDocument.tags = [];
				this._currentDocument.prefixResults = {};
			}
			this._currentDocument.isMarkedAsUndefined = false;
		}
	}

	private static _getStringPositionMapping(document: string) {
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

	private static _getTagBeginingIndex(document: string, position: number) {
		let i = position;

		while (i > 0 && (document[i] !== "<" || XMLParser.getIfPositionIsInString(document, i))) {
			i--;
		}

		return i;
	}

	public static getAttributesOfTheTag(tag: Tag | string) {
		const tagOfTagInterface = tag as Tag;
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

	public static getPositionOfEventHandler(eventHandlerName: string, document: string) {
		let position;

		const regex = new RegExp(`".?${eventHandlerName}"`);
		const result = regex.exec(document);
		if (result) {
			position = result.index;
		}

		return position;
	}

}