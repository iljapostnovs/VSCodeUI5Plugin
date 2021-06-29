import * as vscode from "vscode";
import { CustomDiagnosticType } from "../../../../../../registrators/DiagnosticsRegistrator";

export interface IError {
	code: string;
	message: string;
	range: vscode.Range;
	acornNode: any;
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	sourceClassName?: string;
	source: string;
	isController?: boolean;
	tags?: vscode.DiagnosticTag[];
	severity?: vscode.DiagnosticSeverity;
}
export abstract class Linter {
	protected abstract className: string;
	timePerChar = 0;
	protected abstract _getErrors(document: vscode.TextDocument): IError[];
	getErrors(document: vscode.TextDocument): IError[] {
		const timeStart = new Date().getTime();
		const errors = this._getErrors(document);
		if (errors instanceof Promise) {
			errors.then(() => {
				this._logTime(timeStart, document);
			});
		} else {
			this._logTime(timeStart, document);
		}

		return errors;
	}

	private _logTime(timeStart: number, document: vscode.TextDocument) {
		const timeEnd = new Date().getTime();

		const timeSpent = timeEnd - timeStart;
		this.timePerChar = timeSpent / document.getText().length;
		// console.log(`Time spent by ${this.className}: ${timeSpent}`);
	}
}