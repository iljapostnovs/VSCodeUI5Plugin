import { ESBase } from "./ESBase";

export class ES5Strategy extends ESBase {
	generateVariableDeclaration(): string {
		return "var";
	}
	generateFunction(name: string, params: string, body: string): string {
		return `${name}: function(${params}) {\n\t${body}\n}`;
	}

}