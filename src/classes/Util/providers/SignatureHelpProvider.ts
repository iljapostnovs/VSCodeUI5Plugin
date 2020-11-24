import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../CustomLibMetadata/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";

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
				const stackOfNodes = AcornSyntaxAnalyzer.getStackOfNodesForPosition(currentClassName, position + 1, true);

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
							signatureHelp.activeParameter = callExpression?.arguments.length - 1 || 0;
							const signature = new vscode.SignatureInformation(method.description || `${className} -> ${methodName}`);
							signature.parameters = method.params.map(param => {
								return new vscode.ParameterInformation(param, param/**this one is showing */);
							});

							signatureHelp.signatures = [signature];


							return signatureHelp;
						}
					}
				}
			}
	}
}