import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { UIMethod } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";

export enum PositionType {
	InTheTagAttributes = "1",
	Content = "2",
	InTheString = "3",
	InTheClassName = "4",
	InComments = "5",
	InBodyOfTheClass = "6"
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class XMLParser {
	static getAllIDsInCurrentView() {
		let IdsResult: string[] = [];
		const currentClass = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClass) {
			const viewText = FileReader.getViewText(currentClass);
			if (viewText) {
				IdsResult = viewText.match(/(?<=\sid=").*?(?="\s)/g) || [];
			}
		}

		return IdsResult;
	}
	static getLibraryNameInPosition(XMLViewText: string, currentPosition: number) {
		const currentTagText = this.getTagInPosition(XMLViewText, currentPosition);
		const tagPrefix = this.getTagPrefix(currentTagText);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix, currentPosition);

		return libraryPath;
	}
	static getClassNameInPosition(XMLViewText: string, currentPosition: number) {
		let currentPositionClass = "";
		const currentTagText = this.getTagInPosition(XMLViewText, currentPosition);
		const tagPrefix = this.getTagPrefix(currentTagText);
		const className = this.getClassNameFromTag(currentTagText);
		if (className) {
			const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix, currentPosition);
			currentPositionClass = [libraryPath, className].join(".");
		}

		return currentPositionClass;
	}

	static getParentTagAtPosition(XMLText?: string, position?: number, closedTags: string[] = []) {
		let parentTag = {
			positionBegin: 0,
			positionEnd: 0,
			tag: ""
		};
		if (!XMLText) {
			XMLText = vscode.window.activeTextEditor?.document.getText();
		}
		if (!position) {
			position = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor?.selection.start);
		}

		if (XMLText && position) {
			const {positionBegin, positionEnd} = this.getTagBeginEndPosition(XMLText, position);
			const tag = this.getTagInPosition(XMLText, position);
			const croppedTag = tag.substring(1, tag.length - 1); // remove < >
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
				const className = this.getClassNameFromTag(tag);
				if (closedTags.includes(className)) {
					closedTags.splice(closedTags.indexOf(className), 1);
					parentTag = this.getParentTagAtPosition(XMLText, positionBegin - 1, closedTags);
				} else {
					parentTag.positionBegin = positionBegin;
					parentTag.positionEnd = positionEnd;
					parentTag.tag = tag;
				}

			}
		}

		return parentTag;
	}

	public static getTagInPosition(XMLViewText: string, position: number) {
		const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLViewText, position);
		const tagText = XMLViewText.substring(positionBegin, positionEnd);

		return tagText;
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

	private static lastDocument: string = "";
	private static lastComments: RegExpExecArray[] = [];

	public static getIfPositionIsNotInComments(document: string, position: number) {
		let isPositionNotInComments = true;
		let comments: RegExpExecArray[] = [];

		if (this.lastDocument.length !== document.length) {
			const regExp = new RegExp("<!--(.|\\s)*?-->", "g");

			let result = regExp.exec(document);
			while (result) {
				comments.push(result);
				result = regExp.exec(document);
			}

			this.lastComments = comments;
			this.lastDocument = document;
		} else {
			comments = this.lastComments;
		}

		const comment = comments.find(comment => comment.index <= position && comment.index + comment[0].length > position);

		isPositionNotInComments = !comment;

		return isPositionNotInComments;
	}

	static getIfPositionIsInString(XMLViewText: string, position: number) {
		let quotionMarkCount = 0;

		let i = 0;
		while (i < position) {
			if (XMLViewText[i] === "\"") {
				quotionMarkCount++;
			}

			i++;
		}

		return quotionMarkCount % 2 === 1;
	}

	static getTagPrefix(tagText: string) {
		let tagPrefix = "";

		let i = 0;

		while (i < tagText.length && !/\s|\>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			tagPrefix = tagNameParts[0];
		}

		return tagPrefix;
	}

	static getClassNameFromTag(tagText: string) {
		let className = "";

		let i = 0;

		while (i < tagText.length && !/\s|\>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			className = tagNameParts[1];
		} else {
			className = tagNameParts[0];
		}

		return className;
	}

	static getLibraryPathFromTagPrefix(XMLViewText: string, tagPrefix: string, position: number) {
		let libraryPath = "";
		let regExpBase;
		let delta = 0;
		const results = [];
		const tagPositionEnd = this.getTagBeginEndPosition(XMLViewText, position).positionEnd;

		if (!tagPrefix) {
			regExpBase = `(?<=xmlns\\s?=\\s?").*?(?=")`;
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
			// const positionIsInsideTheClassBody = currentPosition > tagPositionEnd;
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

	static getMethodsOfTheCurrentViewsController() {
		let classMethods: UIMethod[] = [];

		const controllerName = this.getControllerNameOfTheCurrentDocument();
		if (controllerName) {
			classMethods = this.getClassMethodsRecursively(controllerName);
		}

		return classMethods;
	}

	static getControllerNameOfTheCurrentDocument() {
		let controllerName;
		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && currentDocument.fileName.endsWith("view.xml")) {
			const currentDocumentText = currentDocument.getText();
			controllerName = FileReader.getControllerNameFromView(currentDocumentText);
		}

		return controllerName;
	}

	private static getClassMethodsRecursively(className: string, onlyCustomMethods: boolean = true) {
		let methods: UIMethod[] = [];
		const UIClass = UIClassFactory.getUIClass(className);
		methods = UIClass.methods;

		const isThisClassFromAProject = !!FileReader.getManifestForClass(UIClass.parentClassNameDotNotation);
		if (UIClass.parentClassNameDotNotation && (!onlyCustomMethods || isThisClassFromAProject)) {
			methods = methods.concat(this.getClassMethodsRecursively(UIClass.parentClassNameDotNotation));
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
}