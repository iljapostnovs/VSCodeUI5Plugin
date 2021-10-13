import * as vscode from "vscode";
export abstract class DiagramGenerator {
	abstract generate(wsFolder: vscode.WorkspaceFolder): Promise<string>;
	abstract getFileExtension(): string;
}