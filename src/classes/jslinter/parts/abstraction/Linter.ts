import * as vscode from "vscode";

export interface Error {
	code: string;
	message: string;
	range: vscode.Range;
	acornNode: any;
}
export abstract class Linter {
	abstract getErrors(document: string) : Error[];
}