import { IError, Linter } from "./abstraction/Linter";
import * as vscode from "vscode";
import { TextDocumentTransformer } from "../../../../../utils/TextDocumentTransformer";
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { ICustomMember } from "../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
export class InterfaceLinter extends Linter {
	protected className = "InterfaceLinter";
	_getErrors(document: vscode.TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.interfaces && UIClass.interfaces.length > 0) {
			const interfaceMembers: ICustomMember[] = UIClass.interfaces.flatMap(theInterface => [
				...UIClassFactory.getClassMethods(theInterface, false),
				...UIClassFactory.getClassFields(theInterface, false)
			]);
			const undefinedMembers: ICustomMember[] = [];
			const members = [
				...UIClass.methods,
				...UIClass.fields
			];
			interfaceMembers.forEach(interfaceMember => {
				const memberDefined = !!members.find(member => member.name === interfaceMember.name);
				if (!memberDefined) {
					undefinedMembers.push(interfaceMember);
				}
			});
			undefinedMembers.forEach(member => {
				errors.push({
					source: "Interface linter",
					acornNode: null,
					code: "UI5Plugin",
					message: `Interface "${member.owner}" requires "${member.name}" member implementation`,
					range: new vscode.Range(
						new vscode.Position(0, 0),
						new vscode.Position(0, 0)
					),
					severity: vscode.DiagnosticSeverity.Error
				});
			});

		}

		return errors;
	}
}