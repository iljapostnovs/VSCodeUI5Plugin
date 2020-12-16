import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";

export class JSHoverProvider {
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
				const markdownString = this.getMarkdownFromText(textBefore + text);
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
						const markdownString = this.getMarkdownFromText(text);
						hover = new vscode.Hover(markdownString);
					}
				}
			}
		}
		return hover;
	}

	private static getMarkdownFromText(text: string) {
		const markdownString = new vscode.MarkdownString();
		const textParts = text.split("\n");
		markdownString.appendCodeblock(`${textParts[0]}`);
		for (let i = 1; i < textParts.length; i++) {
			if (textParts[i]) {
				markdownString.appendMarkdown("  \n" + textParts[i]);
			}
		}

		return markdownString;
	}

	private static getTextIfItIsFieldOrMethodOfClass(className: string, fieldOrMethodName: string) {
		let text = "";

		const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(className);
		const method = fieldsAndMethods.methods.find(method => method.name === fieldOrMethodName);
		const field = fieldsAndMethods.fields.find(field => field.name === fieldOrMethodName);
		if (method) {
			if (!method.returnType || method.returnType === "void") {
				AcornSyntaxAnalyzer.findMethodReturnType(method, className, true);
			}
			text += `${method.name}(${method.params.join(", ")}) : ${method.returnType}\n`;
			if (method.api) {
				text += method.api;
			}
			text += `${method.description}`;
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
				if (stack.length === 0) {
					stack.push(identifier);
				}
				className = AcornSyntaxAnalyzer.findClassNameForStack(stack, className, undefined, true);
			} else {
				className = "";
			}
		} else {
			className = "";
		}

		return className;
	}
}