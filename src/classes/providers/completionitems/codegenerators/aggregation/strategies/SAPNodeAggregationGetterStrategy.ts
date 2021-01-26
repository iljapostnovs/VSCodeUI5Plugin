import {SAPNode} from "../../../../../librarydata/SAPNode";
import {SAPNodeDAO} from "../../../../../librarydata/SAPNodeDAO";
import {IAggregationGetterStrategy} from "../interfaces/IAggregationGetterStrategy";

export class SAPNodeAggregationGetterStrategy implements IAggregationGetterStrategy {
	private static readonly _nodeDAO = new SAPNodeDAO();
	private readonly _node: SAPNode;

	constructor(node: SAPNode) {
		this._node = node;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPNodeAggregationGetterStrategy | undefined;
		if (this._node.node.extends) {
			const parentNode = SAPNodeAggregationGetterStrategy._nodeDAO.findNode(this._node.node.extends);
			if (parentNode) {
				theParent = new SAPNodeAggregationGetterStrategy(parentNode);
			}
		}

		return theParent;
	}

	getAggregations(): any[] {
		return this._node.getAggregations();
	}

	getAggregation(aggregation: any): {name: string; type: string;} {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}


}