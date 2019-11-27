import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";

export class IfStatement extends AbstractType {
	public bodiesForParsing: string[] = [];

	constructor(name: string, body: string) {
		super(name, body);
	}

	public parseBodyText() {
		let parsedBodyText = this.body;

		let bodiesForParsing: string[] = [];
		//if body
		let bodyOfIfStatement = MainLooper.getEndOfChar("{", "}", parsedBodyText);
		bodiesForParsing.push(bodyOfIfStatement.substring(1, bodyOfIfStatement.length - 1).trim());
		bodyOfIfStatement = parsedBodyText.substring(0, parsedBodyText.indexOf(bodyOfIfStatement) + bodyOfIfStatement.length);
		let restOfTheBody = parsedBodyText.substring(parsedBodyText.indexOf(bodyOfIfStatement) + bodyOfIfStatement.length, parsedBodyText.length);

		let elseBody = this.findElseBody(restOfTheBody, bodiesForParsing);

		parsedBodyText = bodyOfIfStatement + elseBody;
		this.body = parsedBodyText;

		this.parsedBody = bodiesForParsing.join("");
	}

	public parseBody() {
		super.parseBody();
	}

	private findElseBody(body: string, bodiesForParsing: string[]) {
		let elseBody = "";
		//else/else if body
		if (body.startsWith(" else")) {
			const bracketBodyOfElseStatement = MainLooper.getEndOfChar("{", "}", body);
			bodiesForParsing.push(bracketBodyOfElseStatement.substring(1, bracketBodyOfElseStatement.length - 1).trim());
			elseBody = body.substring(0, body.indexOf(bracketBodyOfElseStatement) + bracketBodyOfElseStatement.length);
			const restOfTheBody = body.substring(elseBody.length, body.length);

			elseBody += this.findElseBody(restOfTheBody, bodiesForParsing);
		}

		return elseBody;
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition : AbstractType | undefined;

		definition = this.parts.find(part => part.parsedName === anything.parsedName);

		return definition;
	}

	static isAnIfStatement(text: string) {
		return /(\s|^)if(\s|\()/.test(text);
	}
}