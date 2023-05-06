import { UI5JSParser } from "ui5plugin-parser";
import { ParentMethodStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/ParentMethodStrategy";
import { InterfaceMemberStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/InterfaceMemberStrategy";
import { IFieldsAndMethods } from "ui5plugin-parser/dist/classes/parsing/ui5class/factory/IClassFactory";
import { IUIField, IUIMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../../adapters/vscode/TextDocumentAdapter";
import { CodeGeneratorFactory } from "../../../../templateinserters/codegenerationstrategies/CodeGeneratorFactory";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import { ReusableMethods } from "../../../reuse/ReusableMethods";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";
import { ClassCompletionItemFactory } from "./ClassCompletionItemFactory";

export class JSDynamicCompletionItemsFactory extends ParserBearer<UI5JSParser> implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];
		let fieldsAndMethods = this._parser.syntaxAnalyser.getFieldsAndMethodsOfTheCurrentVariable(
			new TextDocumentAdapter(document),
			document.offsetAt(position)
		);
		if (!fieldsAndMethods) {
			fieldsAndMethods = new ParentMethodStrategy(this._parser).getFieldsAndMethods(
				new TextDocumentAdapter(document),
				document.offsetAt(position)
			);
		}

		if (fieldsAndMethods) {
			fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => !field.deprecated);
			fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => !method.deprecated);
		}

		const interfaceFieldsAndMethods = new InterfaceMemberStrategy(this._parser).getFieldsAndMethods(
			new TextDocumentAdapter(document),
			document.offsetAt(position)
		);

		if (fieldsAndMethods) {
			completionItems = this._generateCompletionItemsFromFieldsAndMethods(fieldsAndMethods, document, position);
		}

		if (interfaceFieldsAndMethods) {
			completionItems.push(
				...this._generateCompletionItemsFromInterfaceFieldsAndMethods(
					interfaceFieldsAndMethods,
					document,
					position
				)
			);
		}

		if (completionItems.length === 0) {
			completionItems = await new ClassCompletionItemFactory(this._parser).createCompletionItems(
				document,
				position
			);
		}

		//copy(JSON.stringify(completionItems.map(item => item.insertText.value || item.insertText)))
		return completionItems;
	}
	private _generateCompletionItemsFromInterfaceFieldsAndMethods(
		fieldsAndMethods: IFieldsAndMethods,
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let completionItems: CustomCompletionItem[] = [];
		completionItems = completionItems.concat(
			fieldsAndMethods.fields.map(classField => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
				completionItem.kind = vscode.CompletionItemKind.Field;
				completionItem.insertText = classField.name;
				completionItem.detail = `(${classField.visibility}) ${classField.name}: ${
					classField.type ? classField.type : "any"
				}`;
				completionItem.documentation = classField.description;

				return completionItem;
			})
		);
		const offset = document.offsetAt(position);
		completionItems = completionItems.concat(
			fieldsAndMethods.methods.map(method => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(method.name);
				completionItem.kind = vscode.CompletionItemKind.Method;
				completionItem.insertText = this._generateInsertTextForInterfaceMethod(method, document, offset);
				completionItem.detail = `(${method.visibility}) ${method.name}: ${
					method.returnType ? method.returnType : "void"
				}`;
				completionItem.sortText = "0";
				completionItem.documentation = method.description;

				return completionItem;
			})
		);

		return completionItems;
	}

	private _generateInsertTextForInterfaceMethod(method: IUIMethod, document: vscode.TextDocument, position: number) {
		let text = method.name;
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
			const codeGenerationStrategy = CodeGeneratorFactory.createStrategy();
			const jsDoc = this._generateJSDocForMethod(method, `implements {${method.owner}}`);
			const params = method.params.map(param => param.name.replace("?", "")).join(", ");
			const functionText = codeGenerationStrategy.generateFunction(method.name, params, "", "");
			text = `${jsDoc}${functionText}`;

			const isMethodLastOne = ReusableMethods.getIfPositionIsInTheLastOrAfterLastMember(UIClass, position);
			if (!isMethodLastOne) {
				text += ",";
			}
		}

		return new vscode.SnippetString(text);
	}

	private _generateCompletionItemsFromFieldsAndMethods(
		fieldsAndMethods: IFieldsAndMethods,
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		//remove duplicates
		fieldsAndMethods.methods = fieldsAndMethods.methods.reduce((accumulator: IUIMethod[], method: IUIMethod) => {
			const methodInAccumulator = accumulator.find(accumulatorMethod => accumulatorMethod.name === method.name);
			if (!methodInAccumulator) {
				accumulator.push(method);
			}
			return accumulator;
		}, []);
		fieldsAndMethods.fields = fieldsAndMethods.fields.reduce((accumulator: IUIField[], field: IUIField) => {
			const methodInAccumulator = accumulator.find(accumulatorField => accumulatorField.name === field.name);
			if (!methodInAccumulator) {
				accumulator.push(field);
			}
			return accumulator;
		}, []);

		const range = position && document.getWordRangeAtPosition(position);
		const word = range && document.getText(range);
		let completionItems: CustomCompletionItem[] = [];

		if (fieldsAndMethods.className === "__override__") {
			//completion items for overriden methods/fields
			completionItems = completionItems.concat(
				fieldsAndMethods.fields.map(classField => {
					const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
					completionItem.kind = vscode.CompletionItemKind.Field;
					completionItem.insertText = classField.name;
					completionItem.detail = `(${classField.visibility}) ${classField.name}: ${
						classField.type ? classField.type : "any"
					}`;
					completionItem.documentation = classField.description;

					return completionItem;
				})
			);
			const offset = document.offsetAt(position);
			completionItems = completionItems.concat(
				fieldsAndMethods.methods.map(method => {
					const completionItem: CustomCompletionItem = new CustomCompletionItem(method.name);
					completionItem.kind = vscode.CompletionItemKind.Method;
					completionItem.insertText = this._generateInsertTextForOverridenMethod(method, document, offset);
					completionItem.detail = `(${method.visibility}) ${method.name}: ${
						method.returnType ? method.returnType : "void"
					}`;
					completionItem.sortText = "0";
					completionItem.documentation = method.description;

					return completionItem;
				})
			);
		} else {
			completionItems = fieldsAndMethods.methods.map(classMethod => {
				const completionItem: CustomCompletionItem = new CustomCompletionItem(classMethod.name);
				completionItem.kind = vscode.CompletionItemKind.Method;

				let insertString = `${classMethod.name}`;
				if (!word) {
					const mandatoryParams = classMethod.params.filter(param => !param.name.endsWith("?"));
					const paramString = mandatoryParams
						.map((param, index) => `\${${index + 1}:${param.name}}`)
						.join(", ");
					insertString += `(${paramString})$0`;
				}
				completionItem.insertText = new vscode.SnippetString(insertString);
				completionItem.detail = `(${classMethod.visibility}) ${fieldsAndMethods.className}`;

				const markdownString = new vscode.MarkdownString();
				markdownString.isTrusted = true;
				markdownString.supportHtml = true;
				if (classMethod.api) {
					markdownString.appendMarkdown(classMethod.api);
				}
				markdownString.appendCodeblock(
					`${classMethod.name}(${classMethod.params.map(param => param.name).join(", ")}): ${
						classMethod.returnType || "void"
					}`
				);
				markdownString.appendMarkdown(classMethod.description);
				completionItem.documentation = markdownString;

				const currentRange = document.getWordRangeAtPosition(position);
				if (currentRange) {
					completionItem.range = currentRange;
				}

				return completionItem;
			});

			completionItems = completionItems.concat(
				fieldsAndMethods.fields.map(classField => {
					const completionItem: CustomCompletionItem = new CustomCompletionItem(classField.name);
					completionItem.kind = vscode.CompletionItemKind.Field;
					completionItem.insertText = classField.name;
					completionItem.detail = `(${classField.visibility}) ${classField.name}: ${
						classField.type ? classField.type : "any"
					}`;
					completionItem.documentation = classField.description;

					return completionItem;
				})
			);

			if (fieldsAndMethods.className !== "generic") {
				this._addRangesToCompletionItems(completionItems, document, position);
			}
		}

		return completionItems;
	}

	private _generateInsertTextForOverridenMethod(method: IUIMethod, document: vscode.TextDocument, position: number) {
		let text = method.name;
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		const methodReturnsAnything = method.returnType !== "void";
		if (className) {
			const UIClass = <CustomJSClass>this._parser.classFactory.getUIClass(className);
			const parentClassName = UIClass.parentClassNameDotNotation;
			const parentUIDefineClassName = UIClass.UIDefine.find(
				UIDefine => UIDefine.classNameDotNotation === parentClassName
			);
			if (parentUIDefineClassName) {
				const codeGenerationStrategy = CodeGeneratorFactory.createStrategy();
				const variableAssignment = methodReturnsAnything
					? `${codeGenerationStrategy.generateVariableDeclaration()} vReturn = `
					: "";
				const returnStatement = methodReturnsAnything ? "\n\treturn vReturn;" : "";
				const jsDoc = this._generateJSDocForMethod(method, "override");
				const params = method.params.map(param => param.name.replace("?", "")).join(", ");
				const functionBody = `${variableAssignment}${parentUIDefineClassName.className}.prototype.${method.name}.apply(this, arguments);\n\t$0\n${returnStatement}`;
				const functionText = codeGenerationStrategy.generateFunction(method.name, params, functionBody, "");
				text = `${jsDoc}${functionText}`;

				const isMethodLastOne = ReusableMethods.getIfPositionIsInTheLastOrAfterLastMember(UIClass, position);
				if (!isMethodLastOne) {
					text += ",";
				}
			}
		}

		return new vscode.SnippetString(text);
	}

	private _generateJSDocForMethod(method: IUIMethod, overrideOrImplements: string) {
		let jsDoc = "/**\n";
		jsDoc += ` * @${overrideOrImplements}\n`;

		const paramTags = method.params
			.map(param => {
				return ` * @param {${param.type}} ${param.isOptional ? "[" : ""}${param.name.replace("?", "")}${
					param.isOptional ? "]" : ""
				} ${param.description}\n`;
			})
			.join("");
		const returnsTag = method.returnType !== "void" ? ` * @returns {${method.returnType}}\n` : "";

		jsDoc += paramTags;
		jsDoc += returnsTag;
		jsDoc += " */\n";

		return jsDoc;
	}

	private _addRangesToCompletionItems(
		completionItems: CustomCompletionItem[],
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		completionItems.forEach(completionItem => {
			const range = new vscode.Range(position.translate({ characterDelta: -1 }), position);
			const text = document.getText(range);
			if (text === ".") {
				completionItem.range = range;
			} else {
				const wordRange = document.getWordRangeAtPosition(position);
				const beforeWordRange = wordRange?.union(
					new vscode.Range(wordRange.start.translate({ characterDelta: -1 }), wordRange.end)
				);
				completionItem.range = beforeWordRange;
			}

			if (completionItem.insertText instanceof vscode.SnippetString) {
				completionItem.insertText.value = "." + completionItem.insertText.value;
			} else {
				completionItem.insertText = "." + completionItem.insertText;
			}

			completionItem.filterText = "." + completionItem.label;
			completionItem.sortText = "0";
		});
	}
}
