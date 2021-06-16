import { SAPIcons } from "../../SAPIcons";

export interface IUIMethodParam {
	name: string;
	description: string;
	isOptional: boolean;
	type: string;
}

export interface IName {
	readonly name: string;
}

export interface IAbstract {
	abstract: boolean;
}

export interface IStatic {
	static: boolean;
}

export interface IUIMethod extends IName, IAbstract, IStatic {
	readonly params: IUIMethodParam[];
	returnType: string;
	description: string;
	visibility: string;
	owner: string;
	api?: string;
}
export interface IUIField extends IName, IAbstract, IStatic {
	type: string | undefined;
	visibility: string;
	owner: string;
	description: string;
}
export interface ITypeValue {
	text: string;
	description: string;
}
export interface IUIProperty extends IName {
	type: string | undefined;
	typeValues: ITypeValue[];
	visibility: string;
	description: string;
	defaultValue?: string;
}
export interface IUIAggregation extends IName {
	type: string;
	multiple: boolean;
	singularName: string;
	visibility: string;
	description: string;
	default: boolean;
}
export interface IUIEventParam extends IName {
	type: string;
}
export interface IUIEvent extends IName {
	visibility: string;
	description: string;
	params: IUIEventParam[];
}
export interface IUIAssociation extends IName {
	type: string | undefined;
	description: string;
	visibility: string;
	multiple: boolean;
	singularName: string;
}
export abstract class AbstractUIClass implements IAbstract {
	public classExists: boolean;
	public abstract: boolean;
	public className: string;
	public methods: IUIMethod[] = [];
	public fields: IUIField[] = [];
	public properties: IUIProperty[] = [];
	public aggregations: IUIAggregation[] = [];
	public events: IUIEvent[] = [];
	public associations: IUIAssociation[] = [];
	public interfaces: string[] = [];
	public parentClassNameDotNotation = "";

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	constructor(className: string, documentText?: string) {
		this.className = className;
		this.classExists = true;
		this.abstract = false;
	}

	protected generateTypeValues(type: string) {
		let typeValues: ITypeValue[] = [];

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
