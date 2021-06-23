import * as vscode from "vscode";
import { CustomDiagnosticType } from "../../../../../registrators/DiagnosticsRegistrator";

export interface IError {
	code: string;
	message: string;
	range: vscode.Range;
	type?: CustomDiagnosticType;
	source: string;
	tags?: vscode.DiagnosticTag[];
	severity?: vscode.DiagnosticSeverity;
}
export abstract class Linter {
	protected abstract className: string;
	protected abstract _getErrors(document: vscode.TextDocument): Promise<IError[]> | IError[];
	getErrors(document: vscode.TextDocument): Promise<IError[]> | IError[] {
		const errors = this._getErrors(document);

		return errors;
	}
}