import { FieldsAndMethods } from "../../../UIClassFactory";
import * as vscode from "vscode";
export abstract class FieldPropertyMethodGetterStrategy {
	abstract getFieldsAndMethods(document: vscode.TextDocument, position: vscode.Position): FieldsAndMethods | undefined;
}