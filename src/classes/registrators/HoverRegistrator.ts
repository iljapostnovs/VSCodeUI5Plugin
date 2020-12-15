import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { AcornSyntaxAnalyzer } from "../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
export class HoverRegistrator {
	static register() {
		const disposable = vscode.languages.registerHoverProvider("javascript", {
			provideHover(document, position, token) {
				const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
				const range = document.getWordRangeAtPosition(position);
				const word = document.getText(range);
				const offset = document.offsetAt(position);
				let text = "";
				let hover: vscode.Hover | undefined;
				if (currentClassName) {
					UIClassFactory.setNewContentForCurrentUIClass();
					let className = strategy.acornGetClassName(currentClassName, offset) || "";
					if (className) {
						const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(className);
						const method = fieldsAndMethods.methods.find(method => method.name === word);
						const field = fieldsAndMethods.fields.find(field => field.name === word);
						if (method) {
							text = `${method.name}(${method.params.join(", ")}) : ${method.returnType}`;
						} else if (field) {
							text = `${field.name} : ${field.type}`;
						}
						if (text) {
							const textBefore = className === currentClassName ? "this." : `${className} -> `;
							hover = new vscode.Hover({
								language: "javascript",
								value: `${textBefore}${text}`
							});
						}
					} else {
						const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
						const method = AcornSyntaxAnalyzer.findAcornNode(UIClass.acornMethodsAndFields, offset);
						if (method.value) {
							const allContent = AcornSyntaxAnalyzer.expandAllContent(method.value);
							const identifier = allContent.find(content => content.type === "Identifier" && content.name === word);
							if (identifier) {
								let position = identifier.end;
								const callee = allContent.find(node => node.callee === identifier);
								if (callee) {
									position = callee.end;
								}
								const stack = strategy.getStackOfNodesForPosition(currentClassName, position, true);
								className = AcornSyntaxAnalyzer.findClassNameForStack(stack, currentClassName, true);
								if (className) {
									hover = new vscode.Hover({
										language: "javascript",
										value: `${word}: ${className}`
									});
								}
							} else {
								const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(currentClassName);
								const method = fieldsAndMethods.methods.find(method => method.name === word);
								const field = fieldsAndMethods.fields.find(field => field.name === word);
								if (method) {
									text = `${method.name}(${method.params.join(", ")}) : ${method.returnType}`;
								} else if (field) {
									text = `${field.name} : ${field.type}`;
								}
								if (text) {
									hover = new vscode.Hover({
										language: "javascript",
										value: `this.${text}`
									});
								}
							}
						}
					}
				}
				return hover;
			}
		});
		UI5Plugin.getInstance().addDisposable(disposable);
	}
}