import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class ForLoop extends AbstractType {
	public parseBodyText() {
		let parsedBodyText = this.body;

		//if body
		const bracketBodyOfWhile = MainLooper.getEndOfChar("{", "}", parsedBodyText);
		const bodyOfFor = parsedBodyText.substring(0, parsedBodyText.indexOf(bracketBodyOfWhile) + bracketBodyOfWhile.length);

		this.body = bodyOfFor;

		this.parsedBody = this.body.trim();
	}
	public parseBody() {}

	static isAForLoop(text: string) {
		return /\sfor(\s|\()/.test(text);
	}
}