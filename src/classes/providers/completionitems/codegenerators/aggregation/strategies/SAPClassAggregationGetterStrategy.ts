import { AbstractUIClass } from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { IAggregationGetterStrategy } from "../interfaces/IAggregationGetterStrategy";

export class SAPClassAggregationGetterStrategy implements IAggregationGetterStrategy {
	private readonly _UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass) {
		this._UIClass = UIClass;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPClassAggregationGetterStrategy | undefined;
		if (this._UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(this._UIClass.parentClassNameDotNotation);
			theParent = new SAPClassAggregationGetterStrategy(parentClass);
		}

		return theParent;
	}

	getAggregations(): any[] {
		return this._UIClass.aggregations;
	}

	getAggregation(aggregation: any): { name: string; type: string; } {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}


}