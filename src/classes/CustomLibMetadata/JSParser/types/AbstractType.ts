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
			const shouldOneCharBeAdded = bodyResult[0].length > fullBody.length;//if one additional char from the upper regex added one char
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
		if (myCurrentDelta < data.delta && data.position < this.positionEnd && data.position > this.positionBegin) {
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

	public findTypeInPosition(position: number) {
		const data = this.findJSTypeWithSmallestDelta({
			type: this,
			position: position,
			delta: Math.abs(this.positionEnd - position)
		});

		return data.type;
	}

	public setParent(parent: AbstractType) {
		this.parent = parent;
	}

	public findDefinition(anything: AbstractType): AbstractType | undefined {
		let definition;

		if (this.parent) {
			definition = this.parent.findDefinition(anything);
		}

		return definition;
	}

	public findAllDefinitionsForVars(anything: AbstractType) {

	}
}


interface findingData {
	delta: number;
	position: number;
	type: AbstractType;
}