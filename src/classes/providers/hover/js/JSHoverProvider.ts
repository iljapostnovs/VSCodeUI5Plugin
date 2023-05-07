import { UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/StandardUIClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";
import HTMLMarkdown from "../../../utils/HTMLMarkdown";

export class JSHoverProvider extends ParserBearer<UI5JSParser> {
	getHover(document: vscode.TextDocument, position: vscode.Position) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser, this._parser);
		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const offset = document.offsetAt(position);
		let hover: vscode.Hover | undefined;

		if (currentClassName) {
			this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));

			const className = strategy.acornGetClassName(currentClassName, offset) || "";
			const fieldsAndMethods = strategy.destructureFieldsAndMethodsAccordingToMapParams(className);
			const text =
				fieldsAndMethods?.className && this._getTextIfItIsMemberOfClass(fieldsAndMethods.className, word);
			if (fieldsAndMethods && text) {
				const textBefore = className === currentClassName ? "this." : `${fieldsAndMethods.className}.`;
				const markdownString = this._getMarkdownFromText(textBefore + text);
				hover = new vscode.Hover(markdownString);
			} else {
				const className = this._getClassNameForOffset(offset, currentClassName, word);
				if (className) {
					const UIClass = this._parser.classFactory.getUIClass(className);
					let text = `${word}: ${className}`;
					if (UIClass instanceof StandardUIClass) {
						const constructor = UIClass.methods.find(method => method.name === "constructor");
						if (constructor) {
							text += `(${constructor.params.map(param => `${param.name}: ${param.type}`).join(", ")})`;
						}
					}
					text += "  \n";
					if (UIClass instanceof AbstractCustomClass) {
						text += this._getNavigateableMarkupToClass(UIClass);
					} else {
						text += this._parser.urlBuilder.getMarkupUrlForClassApi(UIClass);
					}
					text += "  \n";
					text += UIClass.description;
					const markdownString = this._getMarkdownFromText(text);
					hover = new vscode.Hover(markdownString);
				}
			}
		}
		return hover;
	}

	private _getNavigateableMarkupToClass(UIClass: AbstractCustomClass) {
		return `[Go to source](/${encodeURI(UIClass.fsPath.replaceAll("\\", "/"))})\n`;
	}

	private _getMarkdownFromText(text: string) {
		const markdownString = new HTMLMarkdown();
		const textParts = text.split("\n");
		markdownString.appendCodeblock(`${textParts[0]}`);
		for (let i = 1; i < textParts.length; i++) {
			if (textParts[i]) {
				markdownString.appendMarkdown("  \n" + textParts[i]);
			}
		}

		return markdownString;
	}

	private _getTextIfItIsMemberOfClass(className: string, fieldOrMethodName: string) {
		let text = "";

		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser, this._parser);
		const fieldsAndMethods = strategy.destructureFieldsAndMethodsAccordingToMapParams(className);
		if (fieldsAndMethods) {
			const method = fieldsAndMethods.methods.find(method => method.name === fieldOrMethodName);
			const field = fieldsAndMethods.fields.find(field => field.name === fieldOrMethodName);
			if (method) {
				if (!method.returnType || method.returnType === "void") {
					this._parser.syntaxAnalyser.findMethodReturnType(method, className, true, true);
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
					this._parser.syntaxAnalyser.findFieldType(field, className, true, false);
				}
				text = `${field.name} : ${field.type}`;
			}
		}

		return text;
	}

	private _getClassNameForOffset(offset: number, className: string, identifierName: string) {
		const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
		const method = this._parser.syntaxAnalyser.findAcornNode(UIClass.acornMethodsAndFields, offset);
		let node = method?.value;
		if (!node) {
			const UIDefineBody = UIClass.getUIDefineAcornBody();
			node = this._parser.syntaxAnalyser.findAcornNode(UIDefineBody, offset);
		}
		if (node) {
			const allContent = this._parser.syntaxAnalyser.expandAllContent(node);
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
					this._parser.syntaxAnalyser,
					this._parser
				);
				const stack = strategy.getStackOfNodesForPosition(className, position, true);
				if (stack.length === 0) {
					stack.push(identifier);
				}
				className = this._parser.syntaxAnalyser.findClassNameForStack(stack, className, undefined, true);
				if (className) {
					const fieldsAndMethods = strategy.destructureFieldsAndMethodsAccordingToMapParams(className);
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
