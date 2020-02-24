import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class JSReturnKeyword extends AbstractType {
	public parseBodyText() {
		const textBegining = this.body.substring(0, this.getIndexOfReturnKWEnd());
		this.parts = MainLooper.startAnalysing(this.body.replace(textBegining, "") || "");
		this.parts = [this.parts[0]];
		this.body = textBegining + this.parts[0].getFullBody();

		this.parsedBody = this.body.trim().replace("return ", "");
		const lastChar = this.parsedBody[this.parsedBody.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.parsedBody.substring(0, this.parsedBody.length - 1) : this.parsedBody;
	}

	private getIndexOfReturnKWEnd() {
		let i = 0;
		while(i < this.body.length && /return\s/.test(this.body.substring(0, i)) === false) {
			i++;
		}

		return i;
	}

	static isReturnKeyword(text: string) {
		return text.trim().startsWith("return ");
	}
}