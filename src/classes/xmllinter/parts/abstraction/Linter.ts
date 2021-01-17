import * as vscode from "vscode";

export interface Error {
	code: string;
	message: string;
	source: string;
	range: vscode.Range;
	tags?: vscode.DiagnosticTag[];
}

export interface Tag {
	text: string;
	positionBegin: number;
	positionEnd: number;
}

export abstract class Linter {
	abstract getErrors(document: string) : Error[];
}