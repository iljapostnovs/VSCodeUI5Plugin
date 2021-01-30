import {SAPNode} from "../../../../../librarydata/SAPNode";
import {SAPNodeDAO} from "../../../../../librarydata/SAPNodeDAO";
import {IPropertyGetterStrategy} from "../interfaces/IPropertyGetterStrategy";

export class SAPNodePropertyGenerationStrategy implements IPropertyGetterStrategy {
	private static readonly _nodeDAO = new SAPNodeDAO();
	private readonly _node: SAPNode;

	constructor(node: SAPNode) {
		this._node = node;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPNodePropertyGenerationStrategy | undefined;
		if (this._node.node.extends) {
			const parentNode = SAPNodePropertyGenerationStrategy._nodeDAO.findNode(this._node.node.extends);
			if (parentNode) {
				theParent = new SAPNodePropertyGenerationStrategy(parentNode);
			}
		}

		return theParent;
	}

	getProperties(): any[] {
		return this._node.getProperties();
	}

	getProperty(property: any): {name: string; defaultValue: any;} {
		return {
			name: property.name,
			defaultValue: property.defaultValue
		};
	}


}