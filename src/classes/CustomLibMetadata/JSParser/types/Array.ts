import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class JSArray extends AbstractType {
	public parseBodyText() {
		this.body = MainLooper.getEndOfChar("[", "]", this.body);

		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1);
	}

	static isAnArray(char: string) {
		return char === "[";
	}
}