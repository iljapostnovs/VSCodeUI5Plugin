import { SAPNode } from "../../StandardLibMetadata/SAPNode";
import { IPropertyGenerator } from "./IPropertyGenerator";
import { UI5Metadata } from "../../StandardLibMetadata/UI5Metadata";
import { SAPNodeDAO } from "../../DAOAndFactories/SAPNodeDAO";

export class XMLPropertyGenerator implements IPropertyGenerator {
	private nodeDAO = new SAPNodeDAO();

	public async generateProperties(node: SAPNode) {
		let properties: string = "";
		let metadata: UI5Metadata = await node.getMetadata();
		let ui5Metadata = metadata.getUI5Metadata();

		if (ui5Metadata && ui5Metadata.properties) {
			ui5Metadata.properties.forEach((property: any) => {
				if (property.visibility === "public" && !property.deprecatedText) {
					properties += "    " + property.name + "=\"" + property.defaultValue + "\"\n";
				}
			});
		}

		if (node.node.extends) {
			let extendNode: SAPNode = this.nodeDAO.findNode(node.node.extends);
			if (extendNode) {
				properties += await this.generateProperties(extendNode);
			}
		}

		return properties;
	}
}