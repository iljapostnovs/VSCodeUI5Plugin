import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import { IPropertyGetterStrategy } from "../interfaces/IPropertyGetterStrategy";

export class SAPNodePropertyGenerationStrategy extends ParserBearer implements IPropertyGetterStrategy {
	private readonly _node: SAPNode;

	constructor(parser: IUI5Parser, node: SAPNode) {
		super(parser);
		this._node = node;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPNodePropertyGenerationStrategy | undefined;
		if (this._node.node.extends) {
			const parentNode = this._parser.nodeDAO.findNode(this._node.node.extends);
			if (parentNode) {
				theParent = new SAPNodePropertyGenerationStrategy(this._parser, parentNode);
			}
		}

		return theParent;
	}

	getProperties(): any[] {
		return this._node.getProperties();
	}

	getProperty(property: any): { name: string; defaultValue: any } {
		return {
			name: property.name,
			defaultValue: property.defaultValue
		};
	}
}
