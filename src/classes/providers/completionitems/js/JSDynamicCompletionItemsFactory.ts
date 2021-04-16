import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIMethod } from "../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethods, UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import { CustomCompletionItem } from "../CustomCompletionItem";

export class JSDynamicCompletionItemsFactory {

	public createUIClassCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		const fieldsAndMethods = AcornSyntaxAnalyzer.getFieldsAndMethodsOfTheCurrentVariable(document, position);
		if (fieldsAndMethods) {
			completionItems = this._generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods, document, position);
		}

		return completionItems;
	}

	private _generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods: FieldsAndMethods, document: vscode.TextDocument, position: vscode.Position) {
		const range = position && vscode.window.activeTextEditor?.document.getWordRangeAtPosition(position);
		const word = range && vscode.window.activeTextEditor?.document.getText(range);
		let completionItems: CustomCompletionItem[] = [];

		if (fieldsAndMethods.className !== "__override__") {
			completionItems = fieldsAndMethods.methods.map(classMethod => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(classMethod.name);
				completionItem.kind = vscode.CompletionItemKind.Method;

				let insertString = `${classMethod.name}`;
				if (!word) {
					const mandatoryParams = classMethod.params.filter(param => !param.name.endsWith("?"));
					const paramString = mandatoryParams.map((param, index) => `\${${index + 1}:${param.name}}`).join(", ");
					insertString += `(${paramString})$0`;
				}
				completionItem.insertText = new vscode.SnippetString(insertString);
				completionItem.detail = `(${classMethod.visibility}) ${fieldsAndMethods.className}`;

				const mardownString = new vscode.MarkdownString();
				mardownString.isTrusted = true;
				if (classMethod.api) {
					mardownString.appendMarkdown(classMethod.api);
				}
				mardownString.appendCodeblock(`${classMethod.name}(${classMethod.params.map(param => param.name).join(", ")}): ${classMethod.returnType || "void"}`);
				mardownString.appendMarkdown(classMethod.description);
				completionItem.documentation = mardownString;

				const position = vscode.window.activeTextEditor?.selection.start;
				const currentRange = position && vscode.window.activeTextEditor?.document.getWordRangeAtPosition(position);
				if (currentRange) {
					completionItem.range = currentRange;
				}

				return completionItem;
			});

			completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
				completionItem.kind = vscode.CompletionItemKind.Field;
				completionItem.insertText = classField.name;
				completionItem.detail = `(${classField.visibility}) ${classField.name}: ${classField.type ? classField.type : "any"}`;
				completionItem.documentation = classField.description;

				return completionItem;
			}));

			if (fieldsAndMethods.className !== "generic") {
				this._addRangesToCompletionItems(completionItems, document, position);
			}
		} else {

			//completion items for overriden methods/fields
			completionItems = completionItems.concat(fieldsAndMethods.fields.map(classField => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
				completionItem.kind = vscode.CompletionItemKind.Field;
				completionItem.insertText = classField.name;
				completionItem.detail = `(${classField.visibility}) ${classField.name}: ${classField.type ? classField.type : "any"}`;
				completionItem.documentation = classField.description;

				return completionItem;
			}));
			completionItems = completionItems.concat(fieldsAndMethods.methods.map(method => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(method.name);
				completionItem.kind = vscode.CompletionItemKind.Method;
				completionItem.insertText = this._generateInsertTextForOverridenMethod(method, document);
				completionItem.detail = `(${method.visibility}) ${method.name}: ${method.returnType ? method.returnType : "void"}`;
				completionItem.sortText = "0";
				completionItem.documentation = method.description;

				return completionItem;
			}));
		}

		return completionItems;
	}

	private _generateInsertTextForOverridenMethod(method: UIMethod, document: vscode.TextDocument) {
		let text = method.name;
		const className = FileReader.getClassNameFromPath(document.fileName);
		const methodReturnsAnything = method.returnType !== "void";
		if (className) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const parentClassName = UIClass.parentClassNameDotNotation;
			const parentUIDefineClassName = UIClass.UIDefine.find(UIDefine => UIDefine.classNameDotNotation === parentClassName);
			if (parentUIDefineClassName) {
				const variableAssignment = methodReturnsAnything ? "var vReturn = " : "";
				const returnStatement = methodReturnsAnything ? "\n\treturn vReturn;\n" : "";
				const jsDoc = this._generateJSDocForMethod(method);
				const params = method.params.map(param => param.name.replace("?", "")).join(", ");
				text = `${jsDoc}${method.name}: function(${params}) {\n\t${variableAssignment}${parentUIDefineClassName.className}.prototype.${method.name}.apply(this, arguments);\n\t$0\n${returnStatement}},`;
			}
		}

		return new vscode.SnippetString(text);
	}

	private _generateJSDocForMethod(method: UIMethod) {
		let jsDoc = "/**\n";
		jsDoc += " * @override\n";

		const paramTags = method.params.map(param => {
			return ` * @param {${param.type}} ${param.isOptional ? "[" : ""}${param.name.replace("?", "")}${param.isOptional ? "]" : ""} ${param.description}\n`;
		}).join("");
		const returnsTag = method.returnType !== "void" ? ` * @returns {${method.returnType}}\n` : "";

		jsDoc += paramTags;
		jsDoc += returnsTag;
		jsDoc += " */\n";

		return jsDoc;
	}


	private _addRangesToCompletionItems(completionItems: CustomCompletionItem[], document: vscode.TextDocument, position: vscode.Position) {
		completionItems.forEach(completionItem => {
			const range = new vscode.Range(position.translate({ characterDelta: -1 }), position);
			const text = document.getText(range);
			if (text === ".") {
				completionItem.range = range;
			} else {
				const wordRange = document.getWordRangeAtPosition(position);
				const beforeWordRange = wordRange?.union(new vscode.Range(wordRange.start.translate({ characterDelta: -1 }), wordRange.end));
				completionItem.range = beforeWordRange;
			}

			if (completionItem.insertText instanceof vscode.SnippetString) {
				completionItem.insertText.value = "." + completionItem.insertText.value
			} else {
				completionItem.insertText = "." + completionItem.insertText;
			}

			completionItem.filterText = "." + completionItem.label;
			completionItem.sortText = "0";
		});
	}

}