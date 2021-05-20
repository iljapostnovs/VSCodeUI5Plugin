import { ESBase } from "./ESBase";

export class ES6Strategy extends ESBase {
	generateVariableDeclaration(): string {
		return "const";
	}
	generateFunction(name: string, params: string, body: string): string {
		return `${name}(${params}) {\n\t${body}\n}`;
	}
}