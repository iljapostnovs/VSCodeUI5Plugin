import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import { ReusableMethods } from "../../../reuse/ReusableMethods";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import { ICompletionItemFactory } from "../abstraction/ICompletionItemFactory";

export class ClassCompletionItemFactory extends ParserBearer<UI5JSParser> implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems: CustomCompletionItem[] = [];

		const ifPositionIsNewExpressionOrExprStatement = this._getIfPositionIsNewExpressionOrExpressionStatement(
			document,
			position
		);

		if (ifPositionIsNewExpressionOrExprStatement) {
			const classes = ParserPool.getAllExistentUIClasses();
			const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (currentClassName) {
				const currentUIClass = <CustomJSClass>this._parser.classFactory.getUIClass(currentClassName);
				const classNames = Object.keys(classes);
				const customUIClassNames = classNames.filter(
					className => this._parser.classFactory.getUIClass(className) instanceof CustomJSClass
				);
				const flatNodes = this._parser.nodeDAO.getFlatNodes();
				const standardUIClassNames = Object.keys(flatNodes).filter(className => {
					const node = flatNodes[className];
					return (
						node.node.visibility === "public" &&
						(node.getKind() === "class" || node.getKind() === "enum" || node.getKind() === "namespace")
					);
				});
				const allClassNames = customUIClassNames.concat(standardUIClassNames);
				const filteredClassNames = allClassNames.filter(className => {
					return !currentUIClass.UIDefine.find(UIDefine => className === UIDefine.classNameDotNotation);
				});
				const position = new ReusableMethods(this._parser).getPositionOfTheLastUIDefine(document);
				completionItems = filteredClassNames.map(className => {
					const classNameParts = className.split(".");
					const shortClassName = classNameParts[classNameParts.length - 1];
					const completionItem: CustomCompletionItem = new CustomCompletionItem(shortClassName);
					completionItem.kind = vscode.CompletionItemKind.Class;
					completionItem.insertText = shortClassName;
					completionItem.detail = `${className}`;

					if (position) {
						const range = new vscode.Range(position, position);
						const classNameModulePath = `"${className.replace(/\./g, "/")}"`;
						const insertText =
							currentUIClass.UIDefine.length === 0
								? `\n\t${classNameModulePath}`
								: `,\n\t${classNameModulePath}`;
						completionItem.additionalTextEdits = [new vscode.TextEdit(range, insertText)];
						completionItem.command = {
							command: "ui5plugin.moveDefineToFunctionParameters",
							title: "Add to UI Define"
						};
					}

					return completionItem;
				});
			}
		}

		return completionItems;
	}
	private _getIfPositionIsNewExpressionOrExpressionStatement(
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let currentPositionIsNewExpressionOrExpressionStatement = false;

		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const offset = document.offsetAt(position);
			const currentUIClass = <CustomJSClass>this._parser.classFactory.getUIClass(currentClassName);
			const currentMethod = currentUIClass.methods.find(method => {
				return method.node?.start < offset && offset < method.node?.end;
			});
			if (currentMethod) {
				const allContent = this._parser.syntaxAnalyser.expandAllContent(currentMethod.node);
				const newExpressionOrExpressionStatement = allContent.find((node: any) => {
					const firstChar: undefined | string = node.name?.[0];
					const firstCharCaps = firstChar?.toUpperCase();
					return (
						node.type === "Identifier" &&
						firstChar &&
						firstChar === firstCharCaps &&
						node.start <= offset &&
						node.end >= offset
					);
				});

				currentPositionIsNewExpressionOrExpressionStatement = !!newExpressionOrExpressionStatement;
			}
		}

		return currentPositionIsNewExpressionOrExpressionStatement;
	}
}
