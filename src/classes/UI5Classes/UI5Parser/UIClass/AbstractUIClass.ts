import { SAPIcons } from "../../SAPIcons";

export interface UIMethod {
	readonly name: string;
	readonly params: string[];
	returnType: string;
	description: string;
	visibility: string;
	api?: string;
}
export interface UIField {
	readonly name: string;
	type: string | undefined;
	visibility: string;
	description: string;
}
export interface TypeValue {
	text: string;
	description: string;
}
export interface UIProperty {
	name: string;
	type: string | undefined;
	typeValues: TypeValue[];
	visibility: string;
	description: string;
}
export interface UIAggregation {
	name: string;
	type: string | undefined;
	multiple: boolean;
	singularName: string;
	visibility: string;
	description: string;
	default: boolean;
}
export interface UIEventParam {
	name: string;
	type: string;
}
export interface UIEvent {
	name: string;
	visibility: string;
	description: string;
	params: UIEventParam[];
}
export interface UIAssociation {
	name: string;
	type: string | undefined;
	description: string;
	visibility: string;
	multiple: boolean;
	singularName: string;
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

	protected generateTypeValues(type: string) {
		let typeValues: TypeValue[] = [];

		if (type === "boolean") {
			typeValues = [
				{text: "true", description: "boolean true"},
				{text: "false", description: "boolean false"}
			];
		} else if (type === "sap.ui.core.URI") {
			typeValues = SAPIcons.icons.map(icon => ({text: icon, description: icon}));
		} else if (type === "string") {
			// const currentComponentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
			// if (currentComponentName) {
			// 	typeValues = ResourceModelData.resourceModels[currentComponentName];
			// }
		}

		return typeValues;
	}
}
