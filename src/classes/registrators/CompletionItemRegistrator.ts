import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { UIDefineCompletionItemGenerator } from "../providers/completionitems/codegenerators/define/UIDefineCompletionItemGenerator";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { AbstractCompletionItemFactory } from "../providers/completionitems/factories/AbstractCompletionItemFactory";
import { ICompletionItemFactory } from "../providers/completionitems/factories/abstraction/ICompletionItemFactory";
import { SAPUIDefineFactory } from "../providers/completionitems/factories/js/sapuidefine/SAPUIDefineFactory";

export class CompletionItemRegistrator {
	static async register() {
		const JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider(
			{ language: "javascript", scheme: "file" },
			{
				async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					let itemsToReturn: CustomCompletionItem[] = [];
					let completionItemFactory: ICompletionItemFactory | undefined;
					const parser = ParserPool.getParserForFile(document.fileName);
					if (!parser) {
						return;
					}
					if (parser instanceof UI5JSParser) {
						parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
						try {
							if (
								new UIDefineCompletionItemGenerator(parser).getIfCurrentPositionIsInDefine(
									document,
									position
								)
							) {
								completionItemFactory = parser.getCustomData<SAPUIDefineFactory>("SAPUIDefineFactory");
							} else {
								completionItemFactory = AbstractCompletionItemFactory.getFactory(
									AbstractCompletionItemFactory.javascript.member,
									parser
								);
							}
							itemsToReturn =
								(await completionItemFactory?.createCompletionItems(document, position)) ?? [];
						} catch (error) {
							console.log(error);
						}
						// copy(JSON.stringify(itemsToReturn.map(item => item.insertText.value ? `"${item.insertText.value}"` : `"${item.insertText}"`)))
						return itemsToReturn;
					}
				}
			},
			".",
			"\"",
			"'"
		);

		const JSViewIDProvider = vscode.languages.registerCompletionItemProvider(
			{ language: "javascript", scheme: "file" },
			{
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (parser && parser instanceof UI5JSParser) {
						return AbstractCompletionItemFactory.getFactory(
							AbstractCompletionItemFactory.javascript.viewId,
							parser
						)?.createCompletionItems(document, position);
					}
				}
			},
			"\"",
			"'"
		);

		let i = 65;
		const aChars: string[] = [];
		for (i = 65; i <= 122; i++) {
			aChars.push(String.fromCharCode(i));
		}

		const XMLProvider = vscode.languages.registerCompletionItemProvider(
			{ language: "xml", scheme: "file" },
			{
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (!parser) {
						return;
					}
					return AbstractCompletionItemFactory.getFactory(
						AbstractCompletionItemFactory.xml.dynamic,
						parser
					)?.createCompletionItems(document, position);
				}
			},
			"<",
			":",
			"\"",
			"*",
			...aChars
		);

		UI5Plugin.getInstance().addDisposable(XMLProvider);
		UI5Plugin.getInstance().addDisposable(JSMethodPropertyProvider);
		UI5Plugin.getInstance().addDisposable(JSViewIDProvider);
	}
}
