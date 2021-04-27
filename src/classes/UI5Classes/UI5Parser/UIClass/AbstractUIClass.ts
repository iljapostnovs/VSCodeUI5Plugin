import { SAPIcons } from "../../SAPIcons";

export interface UIMethodParam {
	name: string;
	description: string;
	isOptional: boolean;
	type: string;
}

export interface IName {
	readonly name: string;
}
export interface UIMethod extends IName {
	readonly params: UIMethodParam[];
	returnType: string;
	description: string;
	visibility: string;
	owner: string;
	api?: string;
}
export interface UIField extends IName {
	type: string | undefined;
	visibility: string;
	owner: string;
	description: string;
}
export interface TypeValue {
	text: string;
	description: string;
}
export interface UIProperty extends IName {
	type: string | undefined;
	typeValues: TypeValue[];
	visibility: string;
	description: string;
}
export interface UIAggregation extends IName {
	type: string;
	multiple: boolean;
	singularName: string;
	visibility: string;
	description: string;
	default: boolean;
}
export interface UIEventParam extends IName {
	type: string;
}
export interface UIEvent extends IName {
	visibility: string;
	description: string;
	params: UIEventParam[];
}
export interface UIAssociation extends IName {
	type: string | undefined;
	description: string;
	visibility: string;
	multiple: boolean;
	singularName: string;
}
export abstract class AbstractUIClass {
	public classExists: boolean;
	public className: string;
	public methods: UIMethod[] = [];
	public fields: UIField[] = [];
	public properties: UIProperty[] = [];
	public aggregations: UIAggregation[] = [];
	public events: UIEvent[] = [];
	public associations: UIAssociation[] = [];
	public interfaces: string[] = [];
	public parentClassNameDotNotation = "";

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	constructor(className: string, documentText?: string) {
		this.className = className;
		this.classExists = true;
	}

	protected generateTypeValues(type: string) {
		let typeValues: TypeValue[] = [];

		if (type === "boolean") {
			typeValues = [
				{ text: "true", description: "boolean true" },
				{ text: "false", description: "boolean false" }
			];
		} else if (type === "sap.ui.core.URI") {
			typeValues = SAPIcons.icons.map(icon => ({ text: icon, description: icon }));
		} else if (type === "string") {
			// const currentComponentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
			// if (currentComponentName) {
			// 	typeValues = ResourceModelData.resourceModels[currentComponentName];
			// }
		}

		return typeValues;
	}
}
