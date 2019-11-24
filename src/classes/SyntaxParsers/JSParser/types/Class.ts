import { AbstractType } from "./AbstractType";

export class JSClass extends AbstractType {
	public parseBodyText() {
		let lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1);
	}

	public parseName() {
		this.parsedName = this.name.replace("new", "").trim();
	}
}