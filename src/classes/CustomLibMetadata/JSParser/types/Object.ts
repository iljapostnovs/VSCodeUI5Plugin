import { AbstractType } from "./AbstractType";
import { MainLooper } from "../MainLooper";
import { JSComment } from "./JSComment";
import { JSFunction } from "./Function";
import { JSVariable } from "./Variable";

export class JSObject extends AbstractType {
	public partNames: string[] = [];

	public parseBodyText() {
		this.body = MainLooper.getEndOfChar("{", "}", this.body);

		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1); //removes {}
	}

	public parseBody() {
		if (this.parsedBody) {
			let currentIndex = 0;
			let beginIndex = 0;
			while(currentIndex < this.parsedBody.length) {
				if (this.checkIfThisIsComment(this.parsedBody.substring(0, currentIndex))) {
					currentIndex = currentIndex + this.parseBodyPart(this.parsedBody.substring(currentIndex - 2, this.parsedBody.length), "\n") + 1;
					beginIndex = currentIndex;
				} else if (this.parsedBody[currentIndex] === ":") {
					this.partNames.push(this.parsedBody.substring(beginIndex, currentIndex).trim());
					currentIndex = currentIndex + this.parseBodyPart(this.parsedBody.substring(currentIndex + 1, this.parsedBody.length)) + 1;
					beginIndex = currentIndex;
				} else {
					currentIndex++;
				}
			}
			this.assignCommentsToFunction();
		}
	}

	private checkIfThisIsComment(text: string) {
		return text.endsWith("//") || text.endsWith("/*");
	}

	private parseBodyPart(body: string, endChar: string = ",") {
		let index = 0;

		const parts = MainLooper.startAnalysing(body, endChar);
		parts.forEach(part => {
			part.setParent(this);
			this.parts.push(part);
		});

		index = parts.reduce((accumulator, part) => accumulator += part.getContentLength(), 0);

		return index;
	}

	private assignCommentsToFunction() {
		this.parts = this.parts.reduce((accumulator: AbstractType[], part: AbstractType, currentIndex: number) => {
			if (part instanceof JSComment) {
				if (part.isJSDoc() && this.parts[currentIndex + 1] instanceof JSFunction) {
					(<JSFunction>this.parts[currentIndex + 1]).setJSDoc(part);
				}
			} else {
				accumulator.push(part);
			}
			return accumulator;
		}, []);
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition : AbstractType | undefined;

		if (anything.parsedName.startsWith("this.")) {
			const allThisVariables = this.getAllVariables(this).filter(variable => variable.parsedName.startsWith("this."));
			definition = allThisVariables.find(thisVariable => !!thisVariable.jsType && thisVariable.parsedName === anything.parsedName);
		}

		if (!definition) {
			definition = super.findDefinition(anything);
		}

		return definition;
	}

	//refactor. iy is in different jobs
	private getAllVariables(anything: AbstractType) {
		let jsVariables: JSVariable[] = [];
		if (anything instanceof JSVariable) {
			jsVariables.push(anything);
		}

		anything.parts.forEach(part => {
			jsVariables = jsVariables.concat(this.getAllVariables(part));
		});

		if (anything instanceof JSFunction) {
			const variablesFromFunctionParams = <JSVariable[]>(anything.params.filter(param => param instanceof JSVariable));
			jsVariables = jsVariables.concat(variablesFromFunctionParams);
		}

		return jsVariables;
	}

	static isAnObject(char: string) {
		return char === "{";
	}
}