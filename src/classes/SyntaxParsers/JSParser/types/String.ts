import { AbstractType } from "./AbstractType";

export class JSString extends AbstractType {
	parseBody() {
		//nothing to parse
	}

	public parseBodyText() {
		let lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.trim();
	}
}