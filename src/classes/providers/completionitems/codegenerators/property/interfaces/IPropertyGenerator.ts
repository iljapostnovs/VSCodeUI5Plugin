import { IPropertyGetterStrategy } from "./IPropertyGetterStrategy";

export interface IPropertyGenerator {
	generateProperties(strategy: IPropertyGetterStrategy): string;
}