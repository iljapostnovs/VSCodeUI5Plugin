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

export interface IMember extends IName, IAbstract, IStatic, IVisibility {
	description: string;
	owner: string;
}

export interface IVisibility {
	visibility: string;
}
export interface IUIMethod extends IMember {
	readonly params: IUIMethodParam[];
	returnType: string;
	api?: string;
}
export interface IUIField extends IMember {
	type: string | undefined;
}
export interface ITypeValue {
	text: string;
	description: string;
}
export interface IUIProperty extends IName, IVisibility {
	type: string | undefined;
	typeValues: ITypeValue[];
	description: string;
	defaultValue?: string;
}
export interface IUIAggregation extends IName, IVisibility {
	type: string;
	multiple: boolean;
	singularName: string;
	description: string;
	default: boolean;
}
export interface IUIEventParam extends IName {
	type: string;
}
export interface IUIEvent extends IName, IVisibility {
	description: string;
	params: IUIEventParam[];
}
export interface IUIAssociation extends IName, IVisibility {
	type: string | undefined;
	description: string;
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

	constructor(className: string) {
		this.className = className;
		this.classExists = true;
		this.abstract = false;
	}

	getMembers(): IMember[] {
		return [...this.methods, ...this.fields];
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
