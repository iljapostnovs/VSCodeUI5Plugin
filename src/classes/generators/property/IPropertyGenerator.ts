import { SAPNode } from "../../SAPNode";

export interface IPropertyGenerator {
	generateProperties(node: SAPNode) : Promise<string>;
}