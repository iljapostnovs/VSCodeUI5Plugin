import { FieldsAndMethods } from "../../../UIClassFactory";
import * as vscode from "vscode";
export abstract class FieldPropertyMethodGetterStrategy {
	abstract getFieldsAndMethods(document: vscode.TextDocument, position: vscode.Position): FieldsAndMethods | undefined;

	protected _filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods: FieldsAndMethods, visibility = ["public"]) {
		const ignoreAccessLevelModifiers = vscode.workspace.getConfiguration("ui5.plugin").get("ignoreAccessLevelModifiers");
		if (!ignoreAccessLevelModifiers) {
			if (fieldsAndMethods?.fields) {
				fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => visibility.includes(field.visibility));
			}
			if (fieldsAndMethods?.methods) {
				fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => visibility.includes(method.visibility));
			}
		}
	}
}