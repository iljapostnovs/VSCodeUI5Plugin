import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import { URLBuilder } from "../../../utils/URLBuilder";

export class JSHoverProvider {
	static getTextEdits(document: vscode.TextDocument, position: vscode.Position) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		if (currentClassName) {
			UIClassFactory.setNewContentForCurrentUIClass(document);

			const className = strategy.acornGetClassName(currentClassName, offset) || "";
			const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);
			const text = fieldsAndMethods?.className && this._getTextIfItIsFieldOrMethodOfClass(fieldsAndMethods.className, word);
			if (fieldsAndMethods && text) {
				const textBefore = className === currentClassName ? "this." : `${fieldsAndMethods.className}.`;
				const markdownString = this._getMarkdownFromText(textBefore + text);
				hover = new vscode.Hover(markdownString);
			} else {
				const className = this._getClassNameForOffset(offset, currentClassName, word);
				if (className) {
					let text = `${word}: ${className}  \n`;
					const UIClass = UIClassFactory.getUIClass(className);
					text += URLBuilder.getInstance().getMarkupUrlForClassApi(UIClass);
					const markdownString = this._getMarkdownFromText(text);
					hover = new vscode.Hover(markdownString);
				}// else {
					// const text = this._getTextIfItIsFieldOrMethodOfClass(currentClassName, word);
					// if (text) {
					// 	const markdownString = this._getMarkdownFromText(text);
					// 	hover = new vscode.Hover(markdownString);
					// }
				//}
			}
		}
		return hover;
	}

	private static _getMarkdownFromText(text: string) {
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

	private static _getTextIfItIsFieldOrMethodOfClass(className: string, fieldOrMethodName: string) {
		let text = "";

		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);
		if (fieldsAndMethods) {
			const method = fieldsAndMethods.methods.find(method => method.name === fieldOrMethodName);
			const field = fieldsAndMethods.fields.find(field => field.name === fieldOrMethodName);
			if (method) {
				if (!method.returnType || method.returnType === "void") {
					AcornSyntaxAnalyzer.findMethodReturnType(method, className, true, true);
				}
				text += `${method.name}(${method.params.map(param => param.name).join(", ")}) : ${method.returnType}\n`;
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
		}

		return text;
	}

	private static _getClassNameForOffset(offset: number, className: string, identifierName: string) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const method = AcornSyntaxAnalyzer.findAcornNode(UIClass.acornMethodsAndFields, offset);
		let node = method?.value;
		if (!node) {
			const UIDefineBody = UIClass.getUIDefineAcornBody();
			node = AcornSyntaxAnalyzer.findAcornNode(UIDefineBody, offset);
		}
		if (node) {
			const allContent = AcornSyntaxAnalyzer.expandAllContent(node);
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
				if (className) {
					const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);
					if (fieldsAndMethods) {
						className = fieldsAndMethods.className;
					}
				}
			} else {
				className = "";
			}
		} else {
			className = "";
		}

		return className;
	}
}