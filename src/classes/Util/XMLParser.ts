export enum PositionType {
	Properties = "1",
	Content = "2",
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
		const bIsThisAggregation = className[0].toUpperCase() !== className[0];
		if (bIsThisAggregation) {
			className = "";
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

		return positionIsInsideTheClassTag ? PositionType.Properties : PositionType.Content;
	}
}