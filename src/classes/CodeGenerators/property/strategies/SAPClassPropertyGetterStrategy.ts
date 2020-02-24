import { IPropertyGetterStrategy } from "../interfaces/IPropertyGetterStrategy";
import { AbstractUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { UIClassFactory } from "../../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";

export class SAPClassPropertyGetterStrategy implements IPropertyGetterStrategy {
	private readonly UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass) {
		this.UIClass = UIClass;
	}

	getParent(): IPropertyGetterStrategy | undefined {
		let theParent: SAPClassPropertyGetterStrategy | undefined;
		if (this.UIClass.parentClassNameDotNotation) {
			const parentClass = UIClassFactory.getUIClass(this.UIClass.parentClassNameDotNotation);
			theParent = new SAPClassPropertyGetterStrategy(parentClass);
		}

		return theParent;
	}

	getProperties() : any[] {
		return this.UIClass.properties;
	}

	getProperty(property: any): { name: string; defaultValue: any; } {
		return {
			name: property.name,
			defaultValue: ""
		};
	}
}