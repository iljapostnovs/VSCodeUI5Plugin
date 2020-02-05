import { SAPNodeDAO } from "../../StandardLibMetadata/SAPNodeDAO";
import { IAggregationGenerator } from "./IAggregationGenerator";
import { SAPNode } from "../../StandardLibMetadata/SAPNode";

export class XMLAggregationGenerator implements IAggregationGenerator {
	private readonly nodeDAO = new SAPNodeDAO();

	public async generateAggregations(node: SAPNode) {
		let aggregationString: string = "";
		let aggregations: any = await node.getMetadataAggregations();

		if (aggregations) {
			aggregations.forEach((aggregation: any) => {
				if (aggregation.visibility === "public") {
					aggregationString += "    <" + aggregation.name + ">\n";
					aggregationString += "        <!--" + aggregation.type + "-->\n";
					aggregationString += "    </" + aggregation.name + ">\n";
				}
			});
		}

		if (node.node.extends) {
			const extendNode: SAPNode = this.nodeDAO.findNode(node.node.extends);
			if (extendNode) {
				aggregations += await this.generateAggregations(extendNode);
			}
		}

		return aggregationString;
	}
}