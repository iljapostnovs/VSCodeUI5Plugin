import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class IfStatement extends AbstractType {
	public parseBodyText() {
		let parsedBodyText = this.body;

		//if body
		let bodyOfIfStatement = MainLooper.getEndOfChar("{", "}", parsedBodyText);
		bodyOfIfStatement = parsedBodyText.substring(0, parsedBodyText.indexOf(bodyOfIfStatement) + bodyOfIfStatement.length);
		let restOfTheBody = parsedBodyText.substring(parsedBodyText.indexOf(bodyOfIfStatement) + bodyOfIfStatement.length, parsedBodyText.length);

		let elseBody = this.findElseBody(restOfTheBody);

		parsedBodyText = bodyOfIfStatement + elseBody;
		this.body = parsedBodyText;

		this.parsedBody = this.body.trim();
	}

	private findElseBody(body: string) {
		let elseBody = "";
		//else/else if body
		if (body.startsWith(" else")) {
			let bracketBodyOfElseStatement = MainLooper.getEndOfChar("{", "}", body);
			elseBody = body.substring(0, body.indexOf(bracketBodyOfElseStatement) + bracketBodyOfElseStatement.length);
			let restOfTheBody = body.substring(elseBody.length, body.length);

			elseBody += this.findElseBody(restOfTheBody);
		}

		return elseBody;
	}


	public parseBody() {}
}