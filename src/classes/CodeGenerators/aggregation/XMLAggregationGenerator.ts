import { IAggregationGenerator } from "./interfaces/IAggregationGenerator";
import { IAggregationGetterStrategy } from "./interfaces/IAggregationGetterStrategy";
import vscode from "vscode";

export class XMLAggregationGenerator implements IAggregationGenerator {
	public generateAggregations(strategy: IAggregationGetterStrategy, classPrefix: string) {
		let aggregationString: string = "";
		const aggregations: any = strategy.getAggregations();

		aggregations.forEach((aggregation: any) => {
			const parsedAggregation = strategy.getAggregation(aggregation);
			aggregationString += `    <${classPrefix}${parsedAggregation.name}>\n`;
			aggregationString += `        <!--${parsedAggregation.type}-->\n`;
			aggregationString += `    </${classPrefix}${parsedAggregation.name}>\n`;
		});


		const shouldAddInheritedProperties = vscode.workspace.getConfiguration("ui5.plugin").get("addInheritedPropertiesAndAggregations");

		if (shouldAddInheritedProperties) {
			const parent = strategy.getParent();
			if (parent) {
				aggregationString += this.generateAggregations(parent, classPrefix);
			}
		}

		return aggregationString;
	}
}