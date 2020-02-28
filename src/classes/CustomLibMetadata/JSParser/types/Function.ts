import { AbstractType } from "./AbstractType";
import { JSVariable } from "./Variable";
import { JSComment } from "./JSComment";
import { MainLooper } from "../MainLooper";
import { IfStatement } from "./IfStatement";
import { SyntaxAnalyzer } from "../../SyntaxAnalyzer";
import { JSString } from "./String";
import { JSArray } from "./Array";
import { JSClass } from "./Class";
import { JSReturnKeyword } from "./ReturnKeyword";

export class JSFunction extends AbstractType {
	public jsDoc: JSComment | undefined;
	public type = "function"; //todo refactor
	public params: AbstractType[] = [];
	public functionText: string = "";
	public returnType: string | undefined;
	public isAsync: boolean = false;

	constructor(name: string, body: string) {
		super(name, body);

		this.body = body;
		this.functionText = this.body;
		this.isAsync = this.body.trim().startsWith("async");
		this.returnType = this.isAsync ? "Promise" : undefined;
		let params =  this.getParams(this.body);
		const indexOfParamEnd = body.indexOf(params) + params.length;

		this.body =  this.getBodyText(this.body.substring(indexOfParamEnd, this.body.length));

		this.functionText = this.functionText.substring(0, this.functionText.indexOf(this.body) + this.body.length);

		if (params.startsWith("(") && params.endsWith(")")) {
			params = params.substring(1, params.length - 1); //removes ()
		}
		if (params.startsWith("{") && params.endsWith("}")) {
			params = params.substring(1, params.length - 1); //removes {} for destructured objects
		}

		if (params) {
			this.params = params.split(",").map(param => new JSVariable(param.trim(), ""));
			this.params.forEach(param => {
				param.setParent(this);
			});
		}
		this.parseBodyText();
	}

	private getParams(body: string) {
		let params = "";
		const isES5Function = body.trim().startsWith("async function") || body.trim().startsWith("function");

		if (isES5Function) {
			params = MainLooper.getEndOfChar("(", ")", this.body);
		} else {
			const indexOfArrow = body.indexOf("=>");
			const textBeforeArrow = body.substring(0, indexOfArrow);
			const parenthesesAreHere = textBeforeArrow.indexOf("(") > -1;

			if (parenthesesAreHere) {
				params = MainLooper.getEndOfChar("(", ")", this.body);
			} else {
				//no parentheses and it is es6 arrow function, meaning that it's only one param
				params = textBeforeArrow.trim().replace("async", "");
			}
		}

		return params;
	}

	private getBodyText(body: string) {
		let bodyToReturn = "";

		const isArrowFunction = body.trim().startsWith("=>");
		if (isArrowFunction) {
			body = body.trim().replace("=>", "").trim();
			const startsWithBrackets = body.startsWith("{");
			const startsWithParentheses = body.startsWith("(");

			if (startsWithBrackets) {
				bodyToReturn = MainLooper.getEndOfChar("{", "}", body);
			} else if (startsWithParentheses) {
				bodyToReturn = MainLooper.getEndOfChar("(", ")", body);
			} else {
				let i = 0;
				while(body[i] !== ")" && !SyntaxAnalyzer.isSeparator(body[i], false) && i < body.length) {
					i++;
				}
				if (body[i] === ",") {
					i++;
				}
				bodyToReturn = body.substring(0, i);
			}
		} else {
			bodyToReturn = MainLooper.getEndOfChar("{", "}", body);
		}

		return bodyToReturn;
	}

	public setPositions() {
		super.setPositions();

		this.params.forEach(param => {
			param.setPositions();
		});
	}

	public parseBodyText() {
		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;

		if (
			(this.parsedBody.startsWith("{") || this.parsedBody.startsWith("(")) &&
			(this.parsedBody.endsWith("}") || this.parsedBody.endsWith(")"))
		) {
			this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1);
		}
	}

	public parseBody() {
		super.parseBody();
		let part = this.parts.find(part => part instanceof JSReturnKeyword);
		if (part && part.parts.length === 1) {
			part = part.parts[0];
			if (part instanceof JSString) {
				this.returnType = "string";
			} else if (part instanceof JSArray) {
				this.returnType = "array";
			} else if (part instanceof JSClass && part.parsedName === "Promise") {
				this.returnType = "Promise";
			}
		}
	}

	public getContentLength() {
		return this.functionText.length;
	}

	public getFullBody() {
		return this.functionText;
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition : AbstractType | undefined;

		definition = this.params.find(part => part.parsedName === anything.parsedName);

		if (!definition) {
			let i = 0;
			while (!definition && i < this.parts.length) {
				if (this.parts[i] instanceof JSVariable && this.parts[i].parsedName === anything.parsedName && !this.theeseTwoAreRelated(anything, this.parts[i])) {
					definition = this.parts[i].findDefinition(anything);
				} else if (this.parts[i] instanceof IfStatement) {
					definition = this.parts[i].findDefinition(anything);
				}
				i++;
			}
		}
		if (!definition) {
			definition = super.findDefinition(anything);
		}

		return definition;
	}

	private theeseTwoAreRelated(anything: AbstractType, part: AbstractType) : boolean {
		let areRelated = false;
		if (anything === part) {
			areRelated = true;
		} else {
			if (anything.parent) {
				areRelated = this.theeseTwoAreRelated(anything.parent, part);
			}
		}

		return areRelated;
	}

	public setJSDoc(jsDoc: JSComment) {
		this.jsDoc = jsDoc;

		this.params.forEach(param => {
			if (param instanceof JSVariable) {
				param.jsType = this.findJSType(jsDoc.parsedBody || "", param.parsedName || "");
			}
		});

		this.returnType = this.findReturnType(jsDoc.parsedBody);
	}

	private findJSType(jsDoc: string, variableName: string) {
		let jsType;

		const rJSType = new RegExp(`(?<=param\\s{).*?(?=}\\s${variableName})`);
		const jsTypeResult = rJSType.exec(jsDoc);
		if (jsTypeResult) {
			jsType = jsTypeResult[0];
		}

		if (jsType?.endsWith("[]")) {
			jsType = "array";
		}

		return jsType;
	}

	private findReturnType(jsDoc: string) {
		let returnType = this.returnType;

		if (!returnType) {
			const isAsync = /@async\s/.test(jsDoc);
			if (isAsync) {
				returnType = "Promise";
			} else {
				const jsTypeResult = /(?<=return(s?)\s\{).*(?=\})/.exec(jsDoc);
				if (jsTypeResult) {
					returnType = jsTypeResult[0];
					if (returnType.endsWith("[]")) {
						returnType = "array";
					}
				}
			}
		}

		return returnType;
	}

	static isAFunction(text: string, fullJSText: string) {
		let isFunction = text.indexOf("function") > -1;

		if (!isFunction && fullJSText.indexOf("=>") > -1) {
			const textBeforeArrow = fullJSText.substring(0, fullJSText.indexOf("=>") + 2).trim();
			const results = /(async\s)?([a-zA-Z]\w*|\((\{?[a-zA-Z]\w*(,\s*[a-zA-Z]\w*)*\}?)?\))\s?=>/.exec(textBeforeArrow);
			if (results && results[0] === textBeforeArrow) {
				isFunction = true;
			}
		}

		return isFunction;
	}
}