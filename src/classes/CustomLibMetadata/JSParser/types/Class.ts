import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class JSClass extends AbstractType {
	public parseBodyText() {
		this.body =  MainLooper.getEndOfChar("(", ")", this.body);

		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1);
	}

	public parseName() {
		this.parsedName = this.name.replace("new", "").trim();
	}

	static isAClass(text: string, char: string) {
		return text.indexOf("new ") > -1 && char === "(";
	}
}