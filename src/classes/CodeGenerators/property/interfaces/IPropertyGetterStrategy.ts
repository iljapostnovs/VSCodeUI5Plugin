export interface IPropertyGetterStrategy {
	getParent() : IPropertyGetterStrategy | undefined;
	getProperty(property: any) : {
		name: string,
		defaultValue: any
	};

	getProperties() : any[];
}