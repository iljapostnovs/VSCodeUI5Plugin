import { IPropertyGenerator } from "./property/interfaces/IPropertyGenerator";
import { XMLPropertyGenerator } from "./property/XMLPropertyGenerator";
import { XMLAggregationGenerator } from "./aggregation/XMLAggregationGenerator";
import { IAggregationGenerator } from "./aggregation/interfaces/IAggregationGenerator";
import { UIDefineCompletionItemGenerator } from "./define/UIDefineCompletionItemGenerator";

export class GeneratorFactory {
	private static readonly _generatorMap = {
		aggregation: {
			"xml": XMLAggregationGenerator,
			"js": XMLAggregationGenerator //TODO: add js aggregation generator
		},
		property: {
			"xml": XMLPropertyGenerator,
			"js": XMLPropertyGenerator //TODO: add js property generator
		},
		define: {
			"xml": undefined,
			"js": UIDefineCompletionItemGenerator
		}
	};

	static getPropertyGenerator(language: GeneratorFactory.language) {
		let propertyGenerator: IPropertyGenerator;
		propertyGenerator = new GeneratorFactory._generatorMap[GeneratorFactory.type.property][language];

		return propertyGenerator;
	}

	static getAggregationGenerator(language: GeneratorFactory.language) {
		let aggregationGenerator: IAggregationGenerator;
		aggregationGenerator = new GeneratorFactory._generatorMap[GeneratorFactory.type.aggregation][language];

		return aggregationGenerator;
	}

	static getDefineGenerator() {
		return new GeneratorFactory._generatorMap[GeneratorFactory.type.define][GeneratorFactory.language.js];
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