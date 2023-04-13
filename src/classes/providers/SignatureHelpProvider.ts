import { UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../ui5parser/ParserBearer";

export class SignatureHelpProvider extends ParserBearer<UI5JSParser> {
	getSignature(document: vscode.TextDocument, position: vscode.Position) {
		const signatureHelp = new vscode.SignatureHelp();

		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));

		const offset = document.offsetAt(position);

		if (currentClassName && offset) {
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				this._parser.syntaxAnalyser,
				this._parser
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

				const className = this._parser.syntaxAnalyser.findClassNameForStack(stackOfNodes, currentClassName);

				if (methodName && className) {
					const method = this._parser.syntaxAnalyser.findMethodHierarchically(className, methodName);
					if (method && method.params.length > 0) {
						const activeParameter =
							callExpression?.arguments.length - 1 < 0 ? 0 : callExpression?.arguments.length - 1;
						signatureHelp.activeParameter = activeParameter;
						const description = CustomJSClass.generateDescriptionForMethod(method);
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
