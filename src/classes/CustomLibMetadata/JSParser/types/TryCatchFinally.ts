import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class TryCatchFinally extends AbstractType {
	public parseBodyText() {
		let parsedBodyText = this.body;

		//if body
		let bodyOfTry = MainLooper.getEndOfChar("{", "}", parsedBodyText);
		bodyOfTry = parsedBodyText.substring(0, parsedBodyText.indexOf(bodyOfTry) + bodyOfTry.length);
		const restOfTheBody = parsedBodyText.substring(parsedBodyText.indexOf(bodyOfTry) + bodyOfTry.length, parsedBodyText.length);

		const elseBody = this.findElseBody(restOfTheBody);

		parsedBodyText = bodyOfTry + elseBody;
		this.body = parsedBodyText;

		this.parsedBody = this.body.trim();
	}

	private findElseBody(body: string) {
		let elseBody = "";
		if (body.startsWith(" catch") || body.startsWith(" finally")) {
			const bracketBodyOfElseStatement = MainLooper.getEndOfChar("{", "}", body);
			elseBody = body.substring(0, body.indexOf(bracketBodyOfElseStatement) + bracketBodyOfElseStatement.length);
			const restOfTheBody = body.substring(elseBody.length, body.length);

			elseBody += this.findElseBody(restOfTheBody);
		}

		return elseBody;
	}


	public parseBody() {}

	static isATryCatchFinally(text: string) {
		return /\stry(\s|{)/.test(text);
	}
}