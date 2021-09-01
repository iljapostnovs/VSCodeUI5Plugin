import { IAggregationGenerator } from "./interfaces/IAggregationGenerator";
import { IAggregationGetterStrategy } from "./interfaces/IAggregationGetterStrategy";
import * as vscode from "vscode";

export class XMLAggregationGenerator implements IAggregationGenerator {
	public generateAggregations(strategy: IAggregationGetterStrategy, classPrefix: string, isRecursive = false) {
		let aggregationString = "";
		const aggregations: any[] = strategy.getAggregations();

		aggregations.forEach((aggregation: any, index) => {
			const parsedAggregation = strategy.getAggregation(aggregation);
			aggregationString += `    <${classPrefix}${parsedAggregation.name}>\n`;
			if (!isRecursive && index === 0) {
				aggregationString += "        $0\n";
			}
			aggregationString += `    </${classPrefix}${parsedAggregation.name}>\n`;
		});


		const shouldAddInheritedProperties = vscode.workspace.getConfiguration("ui5.plugin").get("addInheritedPropertiesAndAggregations");

		if (shouldAddInheritedProperties) {
			const parent = strategy.getParent();
			if (parent) {
				aggregationString += this.generateAggregations(parent, classPrefix, true);
			}
		}

		if (!isRecursive && aggregationString.length === 0) {
			aggregationString += "    $0\n";
		}

		return aggregationString;
	}
}