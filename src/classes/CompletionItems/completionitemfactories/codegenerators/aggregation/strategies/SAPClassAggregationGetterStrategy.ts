import { AbstractUIClass } from "../../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../../../../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { IAggregationGetterStrategy } from "../interfaces/IAggregationGetterStrategy";

export class SAPClassAggregationGetterStrategy implements IAggregationGetterStrategy {
	private readonly UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass) {
		this.UIClass = UIClass;
	}

	getParent(): IAggregationGetterStrategy | undefined {
		let theParent: SAPClassAggregationGetterStrategy | undefined;
		if (this.UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(this.UIClass.parentClassNameDotNotation);
			theParent = new SAPClassAggregationGetterStrategy(parentClass);
		}

		return theParent;
	}

	getAggregations() : any[] {
		return this.UIClass.aggregations;
	}

	getAggregation(aggregation: any): { name: string; type: string; } {
		return {
			name: aggregation.name,
			type: aggregation.type
		};
	}


}