import * as vscode from "vscode";
import ParserBearer from "../../../ui5parser/ParserBearer";
export abstract class DiagramGenerator extends ParserBearer {
	abstract generate(wsFolder: vscode.WorkspaceFolder): Promise<string>;
	abstract getFileExtension(): string;
}
