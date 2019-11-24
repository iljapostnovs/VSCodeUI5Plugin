import { AbstractType } from "./AbstractType";
import { JSClass } from "./Class";

export class JSVariable extends AbstractType {
	public jsType: string | undefined;
	public parseName() {
		super.parseName();

		this.parsedName = this.parsedName.replace("=", "").replace("var", "").replace(",", "").trim();
	}

	public parseBodyText() {
		let lastChar = this.body[this.body.length - 1];
		this.parsedBody = (lastChar === ";" || lastChar === ",") ? this.body.substring(0, this.body.length - 1) : this.body;
		this.parsedBody = this.parsedBody.trim();
	}

	public parseBody() {
		super.parseBody();

		/* find definition in this variable */
		const myCLass = this.parts.find(part => part instanceof JSClass);
		if (myCLass) {
			this.jsType = myCLass.parsedName;
		}
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition : AbstractType | undefined;

		if (this.jsType && this.parsedName === anything.parsedName) {
			definition = this;
		}

		// Find definition if this variable is defined by another variable
		// const part = this.parts[0]
		// if (part instanceof JSVariable) {
		// 	if (!part.jsType) {
		// 		const definition = part.findDefinition(part);
		// 		if (definition && definition instanceof JSClass) {
		// 			part.jsType = definition.parsedName;
		// 		}
		// 	}
		// 	this.jsType = part.jsType;
		// }

		/* if no definition in this variable, search in parent */
		if (!definition && this.parts.length === 1 && this.parts[0] instanceof JSVariable && this.parent) {
			definition = this.parent.findDefinition(this.parts[0]);

			if (definition && definition instanceof JSVariable) {
				this.jsType = definition.jsType;
			}
		}

		return definition;
	}

	// public parseBody() {
	// 	super.parseBody();
	// 	if (this.parts.length === 1) {
	// 		const part = this.parts[0]
	// 		if (part instanceof JSClass) {
	// 			this.jsType = part.parsedName;
	// 		} else if (part instanceof JSVariable) {
	// 			if (!part.jsType) {
	// 				const definition = part.findDefinition(part);
	// 				if (definition && definition instanceof JSVariable) {
	// 					this.jsType = definition.jsType;
	// 				}
	// 			}
	// 			this.jsType = part.jsType;
	// 		}
	// 	}
	// }

}