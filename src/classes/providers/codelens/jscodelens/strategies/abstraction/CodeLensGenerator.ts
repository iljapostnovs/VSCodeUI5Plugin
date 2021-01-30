import * as vscode from "vscode";
export abstract class CodeLensGenerator {
	abstract getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[];
}