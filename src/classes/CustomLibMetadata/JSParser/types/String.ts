import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class JSString extends AbstractType {
	parseBody() {
		//nothing to parse
	}

	public parseBodyText() {
		const myQuoteType = this.getMyQuoteType();
		const stringBody = MainLooper.getCharPair(myQuoteType, this.body);
		this.body = this.body.substring(0, this.body.indexOf(stringBody) + stringBody.length);

		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.trim();
	}

	private getMyQuoteType() {
		let i = 0;
		let currentChar = this.body[0];

		while (!JSString.isAString(currentChar) && i < this.body.length) {
			i++;
			currentChar = this.body[i];
		}

		return currentChar;
	}

	static isAString(char: string) {
		return char === '"' || char === "'" || char === "`";
	}
}