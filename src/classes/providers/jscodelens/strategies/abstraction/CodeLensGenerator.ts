import * as vscode from "vscode";
export abstract class CodeLensGenerator {
	abstract getCodeLenses(): vscode.CodeLens[];
}