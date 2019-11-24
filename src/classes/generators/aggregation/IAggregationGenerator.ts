import { SAPNode } from "../../SAPNode";

export interface IAggregationGenerator {
	generateAggregations(node: SAPNode) : Promise<string>;
}