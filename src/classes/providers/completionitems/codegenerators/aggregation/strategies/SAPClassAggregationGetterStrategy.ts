import { AbstractJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import { IAggregationGetterStrategy } from "../interfaces/IAggregationGetterStrategy";

export class SAPClassAggregationGetterStrategy extends ParserBearer implements IAggregationGetterStrategy {
	private readonly _UIClass: AbstractJSClass;
	constructor(parser: IUI5Parser, UIClass: AbstractJSClass) {
		super(parser);
		this._UIClass = UIClass;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPClassAggregationGetterStrategy | undefined;
		if (this._UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(this._UIClass.parentClassNameDotNotation);
			theParent = new SAPClassAggregationGetterStrategy(this._parser, parentClass);
		}

		return theParent;
	}

	getAggregations(): any[] {
		return this._UIClass.aggregations;
	}

	getAggregation(aggregation: any): { name: string; type: string } {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}
}
