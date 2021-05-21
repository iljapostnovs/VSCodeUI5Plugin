import * as vscode from "vscode";

export abstract class TemplateGenerator {
	public abstract generateTemplate(uri: vscode.Uri): string | undefined;
}