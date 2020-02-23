import { SAPNode } from "../../../StandardLibMetadata/SAPNode";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { IAggregationGetterStrategy } from "../interfaces/IAggregationGetterStrategy";

export class SAPNodeAggregationGetterStrategy implements IAggregationGetterStrategy {
	private static readonly nodeDAO = new SAPNodeDAO();
	private readonly node: SAPNode;

	constructor(node: SAPNode) {
		this.node = node;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPNodeAggregationGetterStrategy | undefined;
		if (this.node.node.extends) {
			const parentNode: SAPNode = SAPNodeAggregationGetterStrategy.nodeDAO.findNode(this.node.node.extends);
			if (parentNode) {
				theParent = new SAPNodeAggregationGetterStrategy(parentNode);
			}
		}

		return theParent;
	}

	getAggregations() : any[] {
		return this.node.getAggregations();
	}

	getAggregation(aggregation: any): { name: string; type: string; } {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}


}