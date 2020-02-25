import * as vscode from "vscode";
import { FileReader } from "./FileReader";
import { UIMethod } from "../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";

export enum PositionType {
	InTheTagAttributes = "1",
	Content = "2",
	InTheString = "3",
	InTheClassName = "4"
}

export class XMLParser {
	static getLibraryNameInPosition(XMLViewText: string, currentPosition: number) {
		const currentTagText = this.getCurrentTagText(XMLViewText, currentPosition);
		const tagPrefix = this.getTagPrefix(currentTagText);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix);

		return libraryPath;
	}
	static getClassNameInPosition(XMLViewText: string, currentPosition: number) {
		let currentPositionClass = "";
		const currentTagText = this.getCurrentTagText(XMLViewText, currentPosition);
		const tagPrefix = this.getTagPrefix(currentTagText);
		const className = this.getClassNameFromTag(currentTagText);
		if (className) {
			const libraryPath = this.getLibraryPathFromTagPrefix(XMLViewText, tagPrefix);
			currentPositionClass = [libraryPath, className].join(".");
		}

		return currentPositionClass;
	}

	public static getCurrentTagText(XMLViewText: string, currentPosition: number) {
		let tagText = "";
		let i = currentPosition;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;

		while (i > 0 && XMLViewText[i] !== "<") {
			i--;
		}
		tagPositionBegin = i;

		while (i < XMLViewText.length && (XMLViewText[i] !== ">" || this.getIfPositionIsInString(XMLViewText, i))) {
			i++;
		}
		tagPositionEnd = i + 1;

		tagText = XMLViewText.substring(tagPositionBegin, tagPositionEnd);

		return tagText;
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

	static getLibraryPathFromTagPrefix(XMLViewText: string, tagPrefix: string) {
		let libraryPath = "";
		let regExpBase;
		if (!tagPrefix) {
			regExpBase = `(?<=xmlns\\s?=\\s?").*?(?=")`;
		} else {
			regExpBase = `(?<=xmlns(:${tagPrefix})\\s?=\\s?").*?(?=")`;
		}
		const rClassName = new RegExp(regExpBase);
		const classNameResult = rClassName.exec(XMLViewText);

		if (classNameResult) {
			libraryPath = classNameResult[0];
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
				positionType = PositionType.Content;
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

		if (UIClass.parentClassNameDotNotation && (!onlyCustomMethods || !UIClass.parentClassNameDotNotation.startsWith("sap."))) {
			methods = methods.concat(this.getClassMethodsRecursively(UIClass.parentClassNameDotNotation));
		}

		return methods;
	}
}