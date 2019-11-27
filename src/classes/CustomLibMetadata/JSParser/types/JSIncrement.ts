import { AbstractType } from "./AbstractType";

export class JSIncrement extends AbstractType {
	public parseBodyText() {
		this.body = this.cropTextTill(this.body, ";");

		this.parsedBody = this.body.trim();
	}

	private cropTextTill(text: string, char: string) {
		let i = 0;
		while (text[i] !== char && i < text.length) {
			i++;
		}

		return text.substring(0, i + 1);
	}

	public parseBody() {}

	static isAnIncrement(text: string) {
		return text.endsWith("++") || text.endsWith("--");
	}
}