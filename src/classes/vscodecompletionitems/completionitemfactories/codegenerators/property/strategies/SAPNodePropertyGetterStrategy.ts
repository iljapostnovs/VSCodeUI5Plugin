import { SAPNode } from "../../../../../librarydata/SAPNode";
import { SAPNodeDAO } from "../../../../../librarydata/SAPNodeDAO";
import { IPropertyGetterStrategy } from "../interfaces/IPropertyGetterStrategy";

export class SAPNodePropertyGenerationStrategy implements IPropertyGetterStrategy {
	private static readonly nodeDAO = new SAPNodeDAO();
	private readonly node: SAPNode;

	constructor(node: SAPNode) {
		this.node = node;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPNodePropertyGenerationStrategy | undefined;
		if (this.node.node.extends) {
			const parentNode = SAPNodePropertyGenerationStrategy.nodeDAO.findNode(this.node.node.extends);
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