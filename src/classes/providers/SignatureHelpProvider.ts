import { UI5Parser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";

export class SignatureHelpProvider {
	static getSignature(document: vscode.TextDocument, position: vscode.Position) {
		const signatureHelp = new vscode.SignatureHelp();

		const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(
			new TextDocumentAdapter(document)
		);

		const offset = document.offsetAt(position);

		if (currentClassName && offset) {
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser
			);
			const stackOfNodes = positionBeforeCurrentStrategy.getStackOfNodesForPosition(
				currentClassName,
				offset + 1,
				true
			);

			if (stackOfNodes.length > 0) {
				const callExpression =
					stackOfNodes[stackOfNodes.length - 1].type === "CallExpression" ? stackOfNodes.pop() : null; //removes CallExpression
				const lastNode = stackOfNodes.length > 0 ? stackOfNodes.pop() : callExpression;
				let methodName = lastNode.property?.name;

				if (stackOfNodes.length === 0) {
					stackOfNodes.push(lastNode);
					methodName = "constructor";
				}

				const className = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findClassNameForStack(
					stackOfNodes,
					currentClassName
				);

				if (methodName && className) {
					const method = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findMethodHierarchically(
						className,
						methodName
					);
					if (method && method.params.length > 0) {
						const activeParameter =
							callExpression?.arguments.length - 1 < 0 ? 0 : callExpression?.arguments.length - 1;
						signatureHelp.activeParameter = activeParameter;
						const description = CustomUIClass.generateDescriptionForMethod(method);
						const signature = new vscode.SignatureInformation(
							description || `${className} -> ${methodName}`
						);
						signature.parameters = method.params.map(param => {
							return new vscode.ParameterInformation(
								param.name,
								param.description /**this one is showing */
							);
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
