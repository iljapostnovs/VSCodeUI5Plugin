import { SAPIcons } from "../../SAPIcons";
import { FileReader } from "../../../Util/FileReader";
import { ResourceModelData } from "../../ResourceModelData";

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
export interface TypeValue {
	text: string;
	description: string;
}
export interface UIProperty {
	name: string;
	type: string | undefined;
	typeValues: TypeValue[];
	description: string;
}
export interface UIAggregation {
	name: string;
	type: string | undefined;
	multiple: boolean;
	singularName: string;
	description: string;
}
export interface UIEvent {
	name: string;
	description: string;
}
export interface UIAssociation {
	name: string;
	type: string | undefined;
	description: string;
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

	public abstract getClassOfTheVariable(variableName: string, position: number) : string | undefined;

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
			const currentComponentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
			if (currentComponentName) {
				typeValues = ResourceModelData.resourceModels[currentComponentName];
			}
		}

		return typeValues;
	}
}
