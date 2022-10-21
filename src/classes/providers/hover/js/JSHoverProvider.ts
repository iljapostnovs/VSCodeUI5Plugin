import { UI5Parser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { URLBuilder } from "ui5plugin-parser/dist/classes/utils/URLBuilder";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";

export class JSHoverProvider {
	static getTextEdits(document: vscode.TextDocument, position: vscode.Position) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
			AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser
		);
		const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		if (currentClassName) {
			UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(
				new TextDocumentAdapter(document)
			);

			const className = strategy.acornGetClassName(currentClassName, offset) || "";
			const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);
			const text =
				fieldsAndMethods?.className && this._getTextIfItIsMemberOfClass(fieldsAndMethods.className, word);
			if (fieldsAndMethods && text) {
				const textBefore = className === currentClassName ? "this." : `${fieldsAndMethods.className}.`;
				const markdownString = this._getMarkdownFromText(textBefore + text);
				hover = new vscode.Hover(markdownString);
			} else {
				const className = this._getClassNameForOffset(offset, currentClassName, word);
				if (className) {
					const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
					let text = `${word}: ${className}`;
					if (UIClass instanceof StandardUIClass) {
						const constructor = UIClass.methods.find(method => method.name === "constructor");
						if (constructor) {
							text += `(${constructor.params.map(param => `${param.name}: ${param.type}`).join(", ")})`;
						}
					}
					text += "  \n";
					text += URLBuilder.getInstance().getMarkupUrlForClassApi(UIClass);
					const markdownString = this._getMarkdownFromText(text);
					hover = new vscode.Hover(markdownString);
				}
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

	private static _getTextIfItIsMemberOfClass(className: string, fieldOrMethodName: string) {
		let text = "";

		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
			AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser
		);
		const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(className);
		if (fieldsAndMethods) {
			const method = fieldsAndMethods.methods.find(method => method.name === fieldOrMethodName);
			const field = fieldsAndMethods.fields.find(field => field.name === fieldOrMethodName);
			if (method) {
				if (!method.returnType || method.returnType === "void") {
					AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findMethodReturnType(
						method,
						className,
						true,
						true
					);
				}
				text += `${method.name}(${method.params.map(param => `${param.name}: ${param.type}`).join(", ")}) : ${
					method.returnType
				}\n`;
				if (method.api) {
					text += method.api;
				}
				text += `${method.description}`;
			} else if (field) {
				if (!field.type) {
					AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findFieldType(
						field,
						className,
						true,
						false
					);
				}
				text = `${field.name} : ${field.type}`;
			}
		}

		return text;
	}

	private static _getClassNameForOffset(offset: number, className: string, identifierName: string) {
		const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		const method = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findAcornNode(
			UIClass.acornMethodsAndFields,
			offset
		);
		let node = method?.value;
		if (!node) {
			const UIDefineBody = UIClass.getUIDefineAcornBody();
			node = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findAcornNode(UIDefineBody, offset);
		}
		if (node) {
			const allContent = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.expandAllContent(node);
			const identifier = allContent.find(
				content => content.type === "Identifier" && content.name === identifierName
			);
			if (identifier) {
				let position = identifier.end;
				const callee = allContent.find(node => node.callee === identifier);
				if (callee) {
					position = callee.end;
				}
				const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
					AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser
				);
				const stack = strategy.getStackOfNodesForPosition(className, position, true);
				if (stack.length === 0) {
					stack.push(identifier);
				}
				className = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findClassNameForStack(
					stack,
					className,
					undefined,
					true
				);
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
