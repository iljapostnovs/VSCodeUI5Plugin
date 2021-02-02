import { IAggregationGetterStrategy } from "./IAggregationGetterStrategy";

export interface IAggregationGenerator {
	generateAggregations(strategy: IAggregationGetterStrategy, classPrefix: string): string;
}