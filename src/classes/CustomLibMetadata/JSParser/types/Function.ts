import { AbstractType } from "./AbstractType";
import { JSVariable } from "./Variable";
import { JSComment } from "./JSComment";
import { MainLooper } from "../MainLooper";
import { IfStatement } from "./IfStatement";

export class JSFunction extends AbstractType {
	public jsDoc: JSComment | undefined;
	public type = "function"; //todo refactor
	public params: AbstractType[] = [];
	public functionText: string = "";

	constructor(name: string, body: string) {
		super(name, body);

		this.body = body;
		this.functionText = this.body;
		let params =  MainLooper.getEndOfChar("(", ")", this.body);
		this.body =  MainLooper.getEndOfChar("{", "}", this.body);

		this.functionText = this.functionText.substring(0, this.functionText.indexOf(this.body) + this.body.length);

		params = params.substring(1, params.length - 1); //removes ()
		if (params) {
			this.params = params.split(",").map(param => new JSVariable(param.trim(), ""));
			this.params.forEach(param => {
				param.setParent(this);
			});
		}
		this.parseBodyText();
	}

	public parseBodyText() {
		let lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.substring(1, this.parsedBody.length - 1);
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
					//TODO: endless recursion starts here.
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
	}

	private findJSType(jsDoc: string, variableName: string) {
		let jsType;

		const rJSType = new RegExp(`(?<=param\\s{).*?(?=}\\s${variableName})`);
		const jsTypeResult = rJSType.exec(jsDoc);
		if (jsTypeResult) {
			jsType = jsTypeResult[0];
		}

		return jsType;
	}

	static isAFunction(text: string, fullJSText: string) {

		return text.indexOf("function") > -1;
		//TODO: Work on this and add ES6 support, dont forget about test.map(test => test.test());
	}
}