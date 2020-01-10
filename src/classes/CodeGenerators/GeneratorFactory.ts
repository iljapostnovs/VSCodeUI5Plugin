import { IPropertyGenerator } from "./property/IPropertyGenerator";
import { XMLPropertyGenerator } from "./property/XMLPropertyGenerator";
import { XMLAggregationGenerator } from "./aggregation/XMLAggregationGenerator";
import { IAggregationGenerator } from "./aggregation/IAggregationGenerator";
import { DefineGenerator } from "./define/UIDefineCompletionItemGenerator";

export class GeneratorFactory {
	private static generatorMap = {
		aggregation: {
			"xml": XMLAggregationGenerator,
			"js": XMLAggregationGenerator //TODO: add js aggr. generator
		},
		property: {
			"xml": XMLPropertyGenerator,
			"js": XMLPropertyGenerator //TODO: add js property generator
		},
		define: {
			"xml": undefined,
			"js": DefineGenerator
		}
	};

	static getPropertyGenerator(language: GeneratorFactory.language) {
		let propertyGenerator: IPropertyGenerator;
		propertyGenerator = new GeneratorFactory.generatorMap[GeneratorFactory.type.property][language];

		return propertyGenerator;
	}

	static getAggregationGenerator(language: GeneratorFactory.language) {
		let aggregationGenerator: IAggregationGenerator;
		aggregationGenerator = new GeneratorFactory.generatorMap[GeneratorFactory.type.aggregation][language];

		return aggregationGenerator;
	}

	static getDefineGenerator() {
		return new GeneratorFactory.generatorMap[GeneratorFactory.type.define][GeneratorFactory.language.js];
	}
}

export namespace GeneratorFactory {
	export enum language {
		xml = "xml",
		js = "js"
	}
	export enum type {
		property = "property",
		aggregation = "aggregation",
		define = "define"
	}
}