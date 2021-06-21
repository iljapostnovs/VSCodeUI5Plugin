import * as vscode from "vscode";

export interface IError {
	code: string;
	message: string;
	source: string;
	range: vscode.Range;
	tags?: vscode.DiagnosticTag[];
	attribute?: string;
	severity?: vscode.DiagnosticSeverity;
}

export interface ITag {
	text: string;
	positionBegin: number;
	positionEnd: number;
	attributes?: string[];
}

export interface IHierarchicalTag extends ITag {
	tags: IHierarchicalTag[]
}

export abstract class Linter {
	abstract getErrors(document: vscode.TextDocument): IError[];
}