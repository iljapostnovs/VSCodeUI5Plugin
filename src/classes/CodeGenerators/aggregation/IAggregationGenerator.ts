import { SAPNode } from "../../StandardLibMetadata/SAPNode";

export interface IAggregationGenerator {
	generateAggregations(node: SAPNode, classPrefix: string) : string;
}