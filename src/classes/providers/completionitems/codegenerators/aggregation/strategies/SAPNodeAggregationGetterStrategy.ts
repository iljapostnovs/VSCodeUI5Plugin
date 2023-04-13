import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import { IAggregationGetterStrategy } from "../interfaces/IAggregationGetterStrategy";
export class SAPNodeAggregationGetterStrategy extends ParserBearer implements IAggregationGetterStrategy {
	private readonly _node: SAPNode;

	constructor(parser: IUI5Parser, node: SAPNode) {
		super(parser);
		this._node = node;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPNodeAggregationGetterStrategy | undefined;
		if (this._node.node.extends) {
			const parentNode = this._parser.nodeDAO.findNode(this._node.node.extends);
			if (parentNode) {
				theParent = new SAPNodeAggregationGetterStrategy(this._parser, parentNode);
			}
		}

		return theParent;
	}

	getAggregations(): any[] {
		return this._node.getAggregations();
	}

	getAggregation(aggregation: any): { name: string; type: string } {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}
}
