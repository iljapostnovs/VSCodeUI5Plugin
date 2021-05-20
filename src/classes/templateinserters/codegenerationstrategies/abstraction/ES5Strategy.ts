import { ESBase } from "./ESBase";

export class ES5Strategy extends ESBase {
	generateVariableDeclaration(): string {
		return "var";
	}
	generateFunction(name: string, params: string, body: string, tabsToAdd: string): string {
		return `${name}: function(${params}) {\n\t${tabsToAdd}${body}\n${tabsToAdd}}`;
	}

}