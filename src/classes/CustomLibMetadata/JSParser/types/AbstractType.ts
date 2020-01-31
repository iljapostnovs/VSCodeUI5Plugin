import { MainLooper } from "../MainLooper";
import { JSFunction } from "./Function";
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export abstract class AbstractType {
	public body: string;
	public name: string;
	public parsedName: string = "";
	public parsedBody: string = "";
	public parts: AbstractType[] = [];
	public parent: AbstractType | undefined;
	public type = "notafunction"; //todo refactor
	public positionBegin: number = 0;
	public positionEnd: number = 0;

	constructor(name: string, body: string) {
		this.name = name;
		this.body = body;

		this.parseBodyText();
		this.parseName();
	}

	public abstract parseBodyText(): void;

	public parseName() {
		this.parsedName = this.name.trim();
	}

	public parseBody() {
		this.parts = MainLooper.startAnalysing(this.parsedBody || "");
		this.parts.forEach(part => {
			part.setParent(this);
		});
	}

	public getContentLength() {
		return this.body.length + this.name.length;
	}

	public getFullBody() {
		return this.name + this.body;
	}

	//TODO put it in different jobs
	public setPositions() {
		const text = this.parent ? this.parent.getFullBody() : this.getFullBody();
		const startingIndex = this.parent ? this.parent.positionBegin : 0;
		const fullBody = this.getFullBody();
		const rMyFullBody = new RegExp(`([^a-zA-Z]|^)${escapeRegExp(fullBody)}`);

		const bodyResult = rMyFullBody.exec(text);
		if (bodyResult) {
			const shouldOneCharBeAdded = /[^a-zA-Z]/.test(bodyResult[0][0]);
			this.positionBegin = startingIndex + bodyResult.index + (shouldOneCharBeAdded ? 1 : 0);
			this.positionEnd = this.positionBegin + fullBody.length;
		}

		if (text.indexOf(fullBody) === -1) {
			debugger;
		}

		this.parts.forEach(part => {
			part.setPositions();
		});
	}

	public findFunctionByPosition(position: number) {
		let jsFunction: JSFunction | undefined;

		const data = this.findJSTypeWithSmallestDelta({
			type: this,
			position: position,
			delta: Math.abs(this.positionEnd - position)
		});

		jsFunction = this.findFunctionParent(data.type);

		return jsFunction;
	}

	private findFunctionParent(anything: AbstractType): JSFunction | undefined {
		let jsFunction: JSFunction | undefined;
		if (anything.type === "function") {
			jsFunction = <JSFunction>anything;
		} else if (anything.parent) {
			jsFunction = this.findFunctionParent(anything.parent);
		}
		return jsFunction;
	}

	private findJSTypeWithSmallestDelta(data: findingData) {
		const myCurrentDelta = Math.abs(this.positionEnd - data.position);
		if (myCurrentDelta < data.delta) {
			data.type = this;
			data.delta = myCurrentDelta;
		}

		let i = 0;
		while (i < this.parts.length) {
			const partData = this.parts[i].findJSTypeWithSmallestDelta(data);
			if (partData.delta < data.delta) {
				data = partData;
			}
			i++;
		}

		return data;
	}

	public setParent(parent: AbstractType) {
		this.parent = parent;
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition;
		// let i = 0;

		// while (!definition && i < this.parts.length) {
		// 	this.parts[i].findDefinition();
		// }
		if (this.parent) {
			definition = this.parent.findDefinition(anything);
		}

		return definition;
	}

	//TODO: put it somewhere else
	public findAllDefinitionsForVars(anything: AbstractType) {

		// if (this.parts.length === 1) {
		// 	const part = this.parts[0]
		// 	if (part instanceof JSClass) {
		// 		this.jsType = part.parsedName;
		// 	} else if (part instanceof JSVariable) {
		// 		if (!part.jsType) {
		// 			const definition = part.findDefinition(part);
		// 			if (definition && definition instanceof JSVariable) {
		// 				this.jsType = definition.jsType;
		// 			}
		// 		}
		// 		this.jsType = part.jsType;
		// 	}
		// }
	}
}


interface findingData {
	delta: number;
	position: number;
	type: AbstractType;
}