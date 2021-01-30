import {AbstractUIClass} from "../../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import {UIClassFactory} from "../../../../../UI5Classes/UIClassFactory";
import {IPropertyGetterStrategy} from "../interfaces/IPropertyGetterStrategy";

export class SAPClassPropertyGetterStrategy implements IPropertyGetterStrategy {
	private readonly _UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass) {
		this._UIClass = UIClass;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPClassPropertyGetterStrategy | undefined;
		if (this._UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(this._UIClass.parentClassNameDotNotation);
			theParent = new SAPClassPropertyGetterStrategy(parentClass);
		}

		return theParent;
	}

	getProperties(): any[] {
		return this._UIClass.properties;
	}

	getProperty(property: any): {name: string; defaultValue: any;} {
		return {
			name: property.name,
			defaultValue: ""
		};
	}
}