import { AbstractJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import { IPropertyGetterStrategy } from "../interfaces/IPropertyGetterStrategy";

export class SAPClassPropertyGetterStrategy extends ParserBearer implements IPropertyGetterStrategy {
	private readonly _UIClass: AbstractJSClass;
	constructor(parser: IUI5Parser, UIClass: AbstractJSClass) {
		super(parser);
		this._UIClass = UIClass;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPClassPropertyGetterStrategy | undefined;
		if (this._UIClass.parentClassNameDotNotation) {
			const parentClass = this._parser.classFactory.getUIClass(this._UIClass.parentClassNameDotNotation);
			theParent = new SAPClassPropertyGetterStrategy(this._parser, parentClass);
		}

		return theParent;
	}

	getProperties(): any[] {
		return this._UIClass.properties;
	}

	getProperty(property: any): { name: string; defaultValue: any } {
		return {
			name: property.name,
			defaultValue: ""
		};
	}
}
