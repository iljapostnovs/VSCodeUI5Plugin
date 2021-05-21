export abstract class ESBase {
	abstract generateVariableDeclaration(): string;
	abstract generateFunction(name: string, params: string, body: string, tabsToAdd: string): string;
}