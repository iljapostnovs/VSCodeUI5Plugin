export interface IAggregationGetterStrategy {
	getParent() : IAggregationGetterStrategy | undefined;
	getAggregation(aggregation: any) : {
		name: string,
		type: string
	};

	getAggregations() : any[];
}