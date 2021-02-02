import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";

export class SignatureHelpProvider {
	static getSignature(document: vscode.TextDocument) {
		const signatureHelp = new vscode.SignatureHelp();

		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (currentClassName) {
			UIClassFactory.setNewCodeForClass(currentClassName, document.getText());
		}

		const activeTextEditor = vscode.window.activeTextEditor;
		const position = activeTextEditor?.document.offsetAt(activeTextEditor.selection.start);

		if (currentClassName && position) {
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			const stackOfNodes = positionBeforeCurrentStrategy.getStackOfNodesForPosition(currentClassName, position + 1, true);

			if (stackOfNodes. length > 0) {
				const callExpression = stackOfNodes[stackOfNodes.length - 1].type === "CallExpression" ? stackOfNodes.pop() : null; //removes CallExpression
				const lastNode = stackOfNodes.length > 0 ? stackOfNodes.pop() : callExpression;
				let methodName = lastNode.property?.name;

				if (stackOfNodes.length === 0) {
					stackOfNodes.push(lastNode);
					methodName = "constructor";
				}

				const className = AcornSyntaxAnalyzer.findClassNameForStack(stackOfNodes, currentClassName);

				if (methodName && className) {
					const method = AcornSyntaxAnalyzer.findMethodHierarchically(className, methodName);
					if (method && method.params.length > 0) {
						const activeParameter = callExpression?.arguments.length - 1 < 0 ? 0 : callExpression?.arguments.length - 1;
						signatureHelp.activeParameter = activeParameter;
						const description = CustomUIClass.generateDescriptionForMethod(method);
						const signature = new vscode.SignatureInformation(description || `${className} -> ${methodName}`);
						signature.parameters = method.params.map(param => {
							return new vscode.ParameterInformation(param.name, param.description/**this one is showing */);
						});
						signature.documentation = method.description;
						signatureHelp.signatures = [signature];

						return signatureHelp;
					}
				}
			}
		}
	}
}