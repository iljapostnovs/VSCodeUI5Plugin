export interface UIMethod {
	name: string,
	params: string[],
	returnType: string,
	description: string
}
export interface UIField {
	name: string,
	type: string | undefined,
	description: ""
}
export abstract class AbstractUIClass {
	public className: string;
	public methods: UIMethod[] = [];
	public fields: UIField[] = [];
	public parentClassNameDotNotation: string = "";

	constructor(className: string, documentText?: string) {
		this.className = className;
	}

	public abstract getClassOfTheVariable(variableName: string, position: number) : string | undefined;
}
