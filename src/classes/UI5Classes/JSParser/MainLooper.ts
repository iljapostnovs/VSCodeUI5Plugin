export class MainLooper {
	//TODO: Remove
	static getEndOfChar(charBegin: string, charEnd: string, text: string) {
		let body = "";
		let charOpened = false;
		let charBeginQuantity = 0;
		let charEndQuantity = 0;
		let openingCharIndex = 0;
		let index = 0;
		const commentIndexRanges = this._getCommentRanges(text);

		while((!charOpened || charBeginQuantity - charEndQuantity !== 0) && index < text.length) {
			if (!this._checkIfIndexIsInCommentRange(commentIndexRanges, index)) {
				if (text[index] === charBegin) {
					if (!charOpened) {
						charOpened = true;
						openingCharIndex = index;
					}
					charBeginQuantity++;
				} else if (text[index] === charEnd) {
					charEndQuantity++;
				}
			}
			index++;
		}

		if (text[index] === ";" || text[index] === ",") {
			index++;
		}
		body = text.substring(openingCharIndex, index);

		return body;
	}

	private static _getCommentRanges(text: string) {
		const ranges: ICommentRanges[] = [];

		if (this._areAllOpenedCommendsClosed(text)) {
			const rComments = /(\/\*(.|\s)*?\*\/)|(\/\/.*)/g;
			let results = rComments.exec(text);
			while (results) {
				const from = results.index;
				const to = from + results[0].length;
				ranges.push({
					from: from,
					to: to
				});

				results = rComments.exec(text);
			}
		} else {
			ranges.push({
				from: 0,
				to: text.length
			});
		}

		return ranges;
	}

	private static _areAllOpenedCommendsClosed(text: string) {
		let iOpenedCommendCount = 0;
		let iClosedCommentCount = 0;

		for (let i = 0; i < text.length - 1; i++) {
			const nextTwoChars = text.substring(i, i + 2);
			if (nextTwoChars === "/*") {
				iOpenedCommendCount++;
				i++;
			} else if (nextTwoChars === "*/") {
				iClosedCommentCount++;
				i++;
			}
		}

		return iOpenedCommendCount - iClosedCommentCount === 0;
	}

	private static _checkIfIndexIsInCommentRange(commentRanges: ICommentRanges[], index: number) {
		return !!commentRanges.find(commentRange => {
			return index >= commentRange.from && index < commentRange.to;
		});
	}
}

export interface ICommentRanges {
	from: number;
	to: number;
}