import { AbstractType } from "./AbstractType";
import { JSVariable } from "./Variable";
import { JSComment } from "./JSComment";

export class JSFunction extends AbstractType {
	public jsDoc: JSComment | undefined;
	public type = "function"; //todo refactor
	public params: AbstractType[] = [];
	public functionText: string;
	constructor(name: string, body: string, params: string, functionText: string) {
		super(name, body);

		params = params.substring(1, params.length - 1);
		if (params) {
			this.params = params.split(",").map(param => new JSVariable(param.trim(), ""));
			this.params.forEach(param => {
				param.setParent(this);
			});
		}

		this.functionText = functionText;
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
}