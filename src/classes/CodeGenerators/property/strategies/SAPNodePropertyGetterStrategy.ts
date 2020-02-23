import { IPropertyGetterStrategy } from "../interfaces/IPropertyGetterStrategy";
import { SAPNode } from "../../../StandardLibMetadata/SAPNode";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { UI5Metadata } from "../../../StandardLibMetadata/UI5Metadata";

export class SAPNodePropertyGenerationStrategy implements IPropertyGetterStrategy {
	private static readonly nodeDAO = new SAPNodeDAO();
	private readonly node: SAPNode;

	constructor(node: SAPNode) {
		this.node = node;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPNodePropertyGenerationStrategy | undefined;
		if (this.node.node.extends) {
			const parentNode: SAPNode = SAPNodePropertyGenerationStrategy.nodeDAO.findNode(this.node.node.extends);
			if (parentNode) {
				theParent = new SAPNodePropertyGenerationStrategy(parentNode);
			}
		}

		return theParent;
	}

	getProperties() : any[] {
		return this.node.getProperties();
	}

	getProperty(property: any): { name: string; defaultValue: any; } {
		return {
			name: property.name,
			defaultValue: property.defaultValue
		};
	}


}