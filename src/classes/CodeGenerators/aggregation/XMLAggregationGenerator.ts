import { SAPNodeDAO } from "../../StandardLibMetadata/SAPNodeDAO";
import { IAggregationGenerator } from "./IAggregationGenerator";
import { SAPNode } from "../../StandardLibMetadata/SAPNode";

export class XMLAggregationGenerator implements IAggregationGenerator {
	private readonly nodeDAO = new SAPNodeDAO();

	public generateAggregations(node: SAPNode, classPrefix: string) {
		let aggregationString: string = "";
		const aggregations: any = node.getMetadataAggregations();

		if (aggregations) {
			aggregations.forEach((aggregation: any) => {
				if (aggregation.visibility === "public") {
					aggregationString += `    <${classPrefix}${aggregation.name}>\n`;
					aggregationString += `        <!--${aggregation.type}-->\n`;
					aggregationString += `    </${classPrefix}${aggregation.name}>\n`;
				}
			});
		}

		if (node.node.extends) {
			const extendNode: SAPNode = this.nodeDAO.findNode(node.node.extends);
			if (extendNode) {
				aggregationString += this.generateAggregations(extendNode, classPrefix);
			}
		}

		return aggregationString;
	}
}