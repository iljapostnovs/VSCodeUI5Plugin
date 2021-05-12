import * as vscode from "vscode";
import { CustomCompletionItem } from "../../CustomCompletionItem";
export interface ICompletionItemFactory {
	createCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<CustomCompletionItem[]>;
}