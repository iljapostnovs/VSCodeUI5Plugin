import { ParserPool } from "ui5plugin-parser";
import { CustomJSClass, ICustomClassJSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../ui5parser/ParserBearer";
export class ReusableMethods extends ParserBearer {
	getPositionOfTheLastUIDefine(document: vscode.TextDocument) {
		let position: vscode.Position | undefined;
		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass instanceof CustomJSClass) {
			const mainFunction = UIClass.fileContent?.body[0]?.expression;
			const definePaths: any[] = mainFunction?.arguments[0]?.elements;

			let insertPosition = 0;
			if (definePaths?.length) {
				const lastDefinePath = definePaths[definePaths.length - 1];
				insertPosition = lastDefinePath.end;
			} else {
				insertPosition = mainFunction?.arguments[0]?.start;
			}

			position = document.positionAt(insertPosition);
		}

		return position;
	}

	static getParserForCurrentActiveDocument() {
		const activeDocument = vscode.window.activeTextEditor?.document;

		return activeDocument && ParserPool.getParserForFile(activeDocument.fileName);
	}

	static async getOrPromptParser() {
		let parser = this.getParserForCurrentActiveDocument();
		if (!parser) {
			const parsers = ParserPool.getAllParsers();
			if (parsers.length === 1) {
				[parser] = parsers;
			} else {
				const parserWsPaths = parsers.map(parser => parser.workspaceFolder.fsPath);
				const userAnswer = await vscode.window.showQuickPick(parserWsPaths, {
					title: "Please select what project the action will be applied to"
				});
				if (userAnswer) {
					parser = parsers.find(parser => parser.workspaceFolder.fsPath === userAnswer);
				}
			}
		}

		return parser;
	}

	static getIfPositionIsInTheLastOrAfterLastMember(UIClass: CustomJSClass, position: number) {
		const currentMethod = UIClass.methods.find(
			method => method.node?.start < position && method.node?.end > position
		);
		const positionIsInMethod = !!currentMethod;
		const positionIsAfterLastMethod = positionIsInMethod
			? false
			: this._getIfPositionIsAfterLastMember(UIClass, position);

		return positionIsInMethod || positionIsAfterLastMethod;
	}

	private static _getIfPositionIsAfterLastMember(UIClass: CustomJSClass, position: number) {
		let isPositionAfterLastMethod = false;
		const properties = UIClass.acornClassBody?.properties || [];
		const lastProperty = properties[properties.length - 1];
		if (lastProperty) {
			isPositionAfterLastMethod = lastProperty.end <= position && UIClass.acornClassBody.end > position;
		}

		return isPositionAfterLastMethod;
	}

	static getIfMethodIsLastOne(UIClass: CustomJSClass, method: ICustomClassJSMethod) {
		let currentMethodIsLastMethod = false;
		const propertyValues = UIClass.acornClassBody?.properties?.map((node: any) => node.value);
		if (propertyValues) {
			const methodsInClassBody = UIClass.methods.filter(method => {
				return propertyValues.includes(method.node);
			});
			currentMethodIsLastMethod = methodsInClassBody.indexOf(method) === methodsInClassBody.length - 1;
		}

		return currentMethodIsLastMethod;
	}

	static getIfPositionIsInPropertyName(UIClass: CustomJSClass, position: number) {
		let bPositionIsInPropertyName = true;
		const positionIsBetweenProperties = !!UIClass.acornClassBody.properties?.find((node: any, index: number) => {
			let correctNode = false;
			const nextNode = UIClass.acornClassBody.properties[index + 1];
			if (nextNode && node.end < position && nextNode.start > position) {
				correctNode = true;
			}

			return correctNode;
		});

		const positionIsInPropertyKey = !!UIClass.acornClassBody.properties?.find((node: any) => {
			return node.key?.start <= position && node.key?.end >= position;
		});

		bPositionIsInPropertyName = positionIsBetweenProperties || positionIsInPropertyKey;

		return bPositionIsInPropertyName;
	}
}
