import { IAggregationGenerator } from "./aggregation/interfaces/IAggregationGenerator";
import { XMLAggregationGenerator } from "./aggregation/XMLAggregationGenerator";
import { UIDefineCompletionItemGenerator } from "./define/UIDefineCompletionItemGenerator";
import { IPropertyGenerator } from "./property/interfaces/IPropertyGenerator";
import { XMLPropertyGenerator } from "./property/XMLPropertyGenerator";

export class GeneratorFactory {
	private static readonly _generatorMap = {
		aggregation: {
			xml: XMLAggregationGenerator,
			js: XMLAggregationGenerator //TODO: add js aggregation generator
		},
		property: {
			xml: XMLPropertyGenerator,
			js: XMLPropertyGenerator //TODO: add js property generator
		},
		define: {
			xml: undefined,
			js: UIDefineCompletionItemGenerator
		}
	};

	static getPropertyGenerator(language: GeneratorFactory.language) {
		const propertyGenerator: IPropertyGenerator = new GeneratorFactory._generatorMap[
			GeneratorFactory.type.property
		][language]();

		return propertyGenerator;
	}

	static getAggregationGenerator(language: GeneratorFactory.language) {
		const aggregationGenerator: IAggregationGenerator = new GeneratorFactory._generatorMap[
			GeneratorFactory.type.aggregation
		][language]();

		return aggregationGenerator;
	}

	static getDefineGenerator() {
		return GeneratorFactory._generatorMap[GeneratorFactory.type.define][GeneratorFactory.language.js];
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
