import { IPropertyGenerator } from "./interfaces/IPropertyGenerator";
import { IPropertyGetterStrategy } from "./interfaces/IPropertyGetterStrategy";

export class XMLPropertyGenerator implements IPropertyGenerator {
	public generateProperties(strategy: IPropertyGetterStrategy) {
		let properties: string = "";

		strategy.getProperties().forEach((property: any) => {
			const propertyTexts = strategy.getProperty(property);
			properties += `    ${propertyTexts.name}="${propertyTexts.defaultValue}"\n`;
		});

		const parent = strategy.getParent();
		if (parent) {
			properties += this.generateProperties(parent);
		}

		return properties;
	}
}