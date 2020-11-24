import * as vscode from "vscode";

export interface Error {
	code: string;
	message: string;
	source: string;
	range: vscode.Range;
}

export interface Tag {
	text: string;
	positionBegin: number;
	positionEnd: number;
}

export abstract class Linter {
	abstract getErrors(document: string) : Error[];
}