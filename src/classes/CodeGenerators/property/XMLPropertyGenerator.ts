import { SAPNode } from "../../StandardLibMetadata/SAPNode";
import { IPropertyGenerator } from "./IPropertyGenerator";
import { UI5Metadata } from "../../StandardLibMetadata/UI5Metadata";
import { SAPNodeDAO } from "../../StandardLibMetadata/SAPNodeDAO";

export class XMLPropertyGenerator implements IPropertyGenerator {
	private readonly nodeDAO = new SAPNodeDAO();

	public async generateProperties(node: SAPNode) {
		let properties: string = "";
		const metadata: UI5Metadata = await node.getMetadata();
		const ui5Metadata = metadata.getUI5Metadata();

		if (ui5Metadata && ui5Metadata.properties) {
			ui5Metadata.properties.forEach((property: any) => {
				if (property.visibility === "public" && !property.deprecatedText) {
					properties += `    ${property.name}="${property.defaultValue}"\n`;
				}
			});
		}

		if (node.node.extends) {
			const extendNode: SAPNode = this.nodeDAO.findNode(node.node.extends);
			if (extendNode) {
				properties += await this.generateProperties(extendNode);
			}
		}

		return properties;
	}
}