export interface IProperty {
	name: string;
	type: string;
	label?: string;
	length?: string;
	precision?: string;
	scale?: string;
	nullable: boolean;
}

export interface IParameter {
	name: string;
	type: string;
	label?: string;
}
export interface IFunctionImport {
	name: string;
	method: "POST" | "GET",
	returnType: string;
	parameters: IParameter[];
}

export interface IEntityType {
	name: string;
	properties: IProperty[];
	keys: string[];
	navigations: INavigation[];
	entitySetName?: string;
}

export type TCoordinality = "0..1" | "1..1" | "1..n";
export interface INavigation {
	name: string;
	coordinality: TCoordinality;
	type: string;
}

export abstract class AXMLMetadataParser {
	abstract readonly entityTypes: IEntityType[];
	abstract readonly complexTypes: IEntityType[];
	abstract readonly functionImports: IFunctionImport[];
	abstract namespace: string;
}
