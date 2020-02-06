export interface UIMethod {
	name: string;
	params: string[];
	returnType: string;
	description: string;
	api?: string;
}
export interface UIField {
	name: string;
	type: string | undefined;
	description: string;
}
export interface UIProperty {
	name: string;
	type: string | undefined;
	typeValues: string[];
	description: string;
}
export interface UIAggregation {
	name: string;
	type: string | undefined;
	multiple: boolean;
	singularName: string;
}
export interface UIEvent {
	name: string;
	description: string;
}
export interface UIAssociation {
	name: string;
	type: string | undefined;
	description: string;
}
export abstract class AbstractUIClass {
	public className: string;
	public methods: UIMethod[] = [];
	public fields: UIField[] = [];
	public properties: UIProperty[] = [];
	public aggregations: UIAggregation[] = [];
	public events: UIEvent[] = [];
	public associations: UIAssociation[] = [];
	public parentClassNameDotNotation: string = "";

	constructor(className: string, documentText?: string) {
		this.className = className;
	}

	public abstract getClassOfTheVariable(variableName: string, position: number) : string | undefined;
}
