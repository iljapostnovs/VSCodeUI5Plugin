import { IFieldsAndMethods } from "../../../UIClassFactory";
import * as vscode from "vscode";
export abstract class FieldPropertyMethodGetterStrategy {
	abstract getFieldsAndMethods(document: vscode.TextDocument, position: vscode.Position): IFieldsAndMethods | undefined;

	protected _filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods: IFieldsAndMethods, visibility = ["public"]) {
		if (fieldsAndMethods?.fields) {
			fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => visibility.includes(field.visibility));

			if (visibility.includes("private")) {
				fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => field.visibility !== "private" || field.owner === fieldsAndMethods.className);
			}
		}
		if (fieldsAndMethods?.methods) {
			fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => visibility.includes(method.visibility));
			if (visibility.includes("private")) {
				fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => method.visibility !== "private" || method.owner === fieldsAndMethods.className);
			}
		}
	}
}