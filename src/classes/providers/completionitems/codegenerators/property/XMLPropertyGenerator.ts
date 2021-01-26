import {IPropertyGenerator} from "./interfaces/IPropertyGenerator";
import {IPropertyGetterStrategy} from "./interfaces/IPropertyGetterStrategy";
import * as vscode from "vscode";
export class XMLPropertyGenerator implements IPropertyGenerator {
	public generateProperties(strategy: IPropertyGetterStrategy) {
		let properties = "";

		strategy.getProperties().forEach((property: any) => {
			const propertyTexts = strategy.getProperty(property);
			properties += `    ${propertyTexts.name}="${propertyTexts.defaultValue}"\n`;
		});

		const shouldAddInheritedProperties = vscode.workspace.getConfiguration("ui5.plugin").get("addInheritedPropertiesAndAggregations");

		if (shouldAddInheritedProperties) {
			const parent = strategy.getParent();
			if (parent) {
				properties += this.generateProperties(parent);
			}
		}

		return properties;
	}
}