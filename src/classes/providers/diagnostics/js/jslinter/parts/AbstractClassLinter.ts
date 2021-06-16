import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
export class AbstractClassLinter extends Linter {
	protected className = "AbstractClassLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const parent = UIClassFactory.getParent(UIClass);
			if (parent?.abstract) {
				const undefinedMembers: string[] = [];
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
						undefinedMembers.push(abstractMember.name);
					}
				});
				undefinedMembers.forEach(member => {
					errors.push({
						source: "Abstract class linter",
						acornNode: null,
						code: "UI5Plugin",
						message: `Member "${member}" should be defined`,
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