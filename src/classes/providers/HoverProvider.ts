import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";

export class HoverProvider {
	static getTextEdits(document: vscode.TextDocument, position: vscode.Position) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		if (currentClassName) {
			UIClassFactory.setNewContentForCurrentUIClass();

			const className = strategy.acornGetClassName(currentClassName, offset) || "";
			const text = className && this.getTextIfItIsFieldOrMethodOfClass(className, word);
			if (text) {
				const textBefore = className === currentClassName ? "this." : `${className}.`;
				const markdownString = new vscode.MarkdownString();
				const textParts = text.split("\n");
				markdownString.appendCodeblock(`${textBefore}${textParts[0]}`);
				if (textParts[1]) {
					markdownString.appendText(textParts[1]);
				}
				hover = new vscode.Hover(markdownString);
			} else {
				const className = this.getClassNameForOffset(offset, currentClassName, word);
				if (className) {
					hover = new vscode.Hover({
						language: "javascript",
						value: `${word}: ${className}`
					});
				} else {
					const text = this.getTextIfItIsFieldOrMethodOfClass(currentClassName, word);
					if (text) {
						const markdownString = new vscode.MarkdownString();
						const textParts = text.split("\n");
						markdownString.appendCodeblock(`this.${textParts[0]}`);
						if (textParts[1]) {
							markdownString.appendText(textParts[1]);
						}
						hover = new vscode.Hover(markdownString);
					}
				}
			}
		}
		return hover;
	}

	private static getTextIfItIsFieldOrMethodOfClass(className: string, fieldOrMethodName: string) {
		let text = "";

		const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(className);
		const method = fieldsAndMethods.methods.find(method => method.name === fieldOrMethodName);
		const field = fieldsAndMethods.fields.find(field => field.name === fieldOrMethodName);
		if (method) {
			text = `${method.name}(${method.params.join(", ")}) : ${method.returnType}`;
			text += `\n${method.description}`;
		} else if (field) {
			if (!field.type) {
				AcornSyntaxAnalyzer.findFieldType(field, className, true);
			}
			text = `${field.name} : ${field.type}`;
		}

		return text;
	}

	private static getClassNameForOffset(offset: number, className: string, identifierName: string) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const method = AcornSyntaxAnalyzer.findAcornNode(UIClass.acornMethodsAndFields, offset);
		if (method.value) {
			const allContent = AcornSyntaxAnalyzer.expandAllContent(method.value);
			const identifier = allContent.find(content => content.type === "Identifier" && content.name === identifierName);
			if (identifier) {
				let position = identifier.end;
				const callee = allContent.find(node => node.callee === identifier);
				if (callee) {
					position = callee.end;
				}
				const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const stack = strategy.getStackOfNodesForPosition(className, position, true);
				className = AcornSyntaxAnalyzer.findClassNameForStack(stack, className, true);
			} else {
				className = "";
			}
		} else {
			className = "";
		}

		return className;
	}
}