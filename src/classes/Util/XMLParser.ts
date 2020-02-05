export enum PositionType {
	InTheTag = "1",
	Content = "2",
	InTheString = "3"
}

export class XMLParser {
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

	private static getCurrentTagText(XMLViewText: string, currentPosition: number) {
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

	private static getIfPositionIsInString(XMLViewText: string, position: number) {
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

	private static getTagPrefix(tagText: string) {
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

	private static getClassNameFromTag(tagText: string) {
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

	private static getLibraryPathFromTagPrefix(XMLViewText: string, tagPrefix: string) {
		let libraryPath = "";
		let regExpBase;
		if (!tagPrefix) {
			regExpBase = `(?<=xmlns=").*?(?=")`;
		} else {
			regExpBase = `(?<=xmlns(:${tagPrefix})=").*?(?=")`;
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

			if (positionIsInsideTheClassTag) {
				positionType = PositionType.InTheTag;
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

	static getNearestProperty(XMLViewText: string, currentPosition: number) {
		let i = currentPosition;

		while (!/\s/.test(XMLViewText[i]) && i > 0) {
			i--;
		}

		return XMLViewText.substring(i + 1, currentPosition).replace("=", "");
	}
}