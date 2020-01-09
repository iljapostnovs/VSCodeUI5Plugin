import { AbstractType } from "./AbstractType";

export class JSComment extends AbstractType {
	public parseBodyText() {
		const parsedBodyText = this.body;
		var comment : string = "";

		if (parsedBodyText.trim().startsWith("/*")) {
			/*for this comment*/
			comment = this.findChars("*/", parsedBodyText, "/*");
		} else {
			//for this comment
			comment = this.findChars("\n", parsedBodyText, "//");
		}

		this.body = comment;

		this.parsedBody = this.body.trim();
	}
	public parseBody() {}

	private findChars(chars: string, text: string, charsThatStartsComment: string) {
		let i = 0;
		let textToFind = "";
		let charsShouldBeIgnored = true;

		while (i < text.length && (!textToFind.endsWith(chars) || charsShouldBeIgnored)) {
			textToFind += text[i];
			i++;

			if (textToFind.endsWith(charsThatStartsComment)) {
				charsShouldBeIgnored = false;
			}
		}

		return textToFind;
	}

	public isJSDoc() {
		return this.parsedBody && this.parsedBody.startsWith("/**");
	}

	static isAComment(text: string) {
		return text.endsWith("/*") || text.endsWith("//");
	}
}