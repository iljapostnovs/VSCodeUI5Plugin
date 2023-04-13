import * as vscode from "vscode";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
export abstract class CodeLensGenerator extends ParserBearer {
	abstract getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[];
}
