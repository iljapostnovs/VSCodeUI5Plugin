import { AbstractType } from "./AbstractType";
import { JSClass } from "./Class";
import { JSArray } from "./Array";

export class JSVariable extends AbstractType {
	public jsType: string | undefined;
	public parseName() {
		super.parseName();

		this.parsedName = this.parsedName
			.replace("=", "")
			.replace("var ", "")
			.replace("const ", "")
			.replace("let ", "")
			.replace(",", "").trim();
	}

	public parseBodyText() {
		const lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.trim();
	}

	public parseBody() {
		super.parseBody();

		/* find definition in this variable */
		const myCLass = this.parts.find(part => part instanceof JSClass);
		if (myCLass) {
			this.jsType = myCLass.parsedName;
		} else if (this.parts.length === 1 && this.parts[0] instanceof JSArray) {
			this.jsType = "array";
		}
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition : AbstractType | undefined;

		if (this.jsType && this.parsedName === anything.parsedName) {
			definition = this;
		}

		/* if no definition in this variable, search in parent */
		if (!definition && this.parts.length === 1 && this.parts[0] instanceof JSVariable && this.parent) {
			definition = this.parent.findDefinition(this.parts[0]);

			if (definition && definition instanceof JSVariable) {
				this.jsType = definition.jsType;
			}
		}

		return definition;
	}

	static isVariable(text: string) {
		return /((var|const|let)\s)?(.*=)|this\..*\s=|(var|const|let)\s.*?(?=;)/.test(text) || text.endsWith(";");
	}

}