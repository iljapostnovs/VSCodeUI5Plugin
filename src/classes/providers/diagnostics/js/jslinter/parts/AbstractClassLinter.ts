import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { ICustomMember } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
export class AbstractClassLinter extends Linter {
	protected className = "AbstractClassLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const parent = UIClassFactory.getParent(UIClass);
			if (parent?.abstract) {
				const undefinedMembers: ICustomMember[] = [];
				const members = [
					...UIClass.methods,
					...UIClass.fields
				];
				const parentMembers = [
					...parent.methods,
					...parent.fields
				];
				const abstractMembers = parentMembers.filter(member => member.abstract);
				abstractMembers.forEach(abstractMember => {
					const memberDefined = !!members.find(member => member.name === abstractMember.name);
					if (!memberDefined) {
						undefinedMembers.push(abstractMember);
					}
				});
				undefinedMembers.forEach(member => {
					errors.push({
						source: "Abstract class linter",
						acornNode: null,
						code: "UI5Plugin",
						message: `Abstract class "${member.owner}" requires "${member.name}" member implementation`,
						range: new vscode.Range(
							new vscode.Position(0, 0),
							new vscode.Position(0, 0)
						),
						severity: vscode.DiagnosticSeverity.Error
					});
				});
			}
		}

		return errors;
	}
}