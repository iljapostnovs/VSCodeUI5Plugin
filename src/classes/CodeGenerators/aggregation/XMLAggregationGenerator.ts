import { SAPNodeDAO } from "../../StandardLibMetadata/SAPNodeDAO";
import { IAggregationGenerator } from "./IAggregationGenerator";
import { SAPNode } from "../../StandardLibMetadata/SAPNode";

export class XMLAggregationGenerator implements IAggregationGenerator {
	private static readonly nodeDAO = new SAPNodeDAO();

	public generateAggregations(node: SAPNode, classPrefix: string) {
		let aggregationString: string = "";
		const aggregations: any = node.getAggregations();

		if (aggregations) {
			aggregations.forEach((aggregation: any) => {
				aggregationString += `    <${classPrefix}${aggregation.name}>\n`;
				aggregationString += `        <!--${aggregation.type}-->\n`;
				aggregationString += `    </${classPrefix}${aggregation.name}>\n`;
			});
		}

		if (node.node.extends) {
			const extendNode: SAPNode = XMLAggregationGenerator.nodeDAO.findNode(node.node.extends);
			if (extendNode) {
				aggregationString += this.generateAggregations(extendNode, classPrefix);
			}
		}

		return aggregationString;
	}
}