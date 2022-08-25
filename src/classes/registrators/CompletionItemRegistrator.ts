import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { UIDefineCompletionItemGenerator } from "../providers/completionitems/codegenerators/define/UIDefineCompletionItemGenerator";
import { ICompletionItemFactory } from "../providers/completionitems/factories/abstraction/ICompletionItemFactory";
import { AbstractCompletionItemFactory } from "../providers/completionitems/factories/AbstractCompletionItemFactory";
import { StandardXMLCompletionItemFactory } from "../providers/completionitems/factories/xml/StandardXMLCompletionItemFactory";
import { SAPUIDefineFactory } from "../providers/completionitems/factories/js/sapuidefine/SAPUIDefineFactory";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";

export class CompletionItemRegistrator {
	static async register() {
		await new StandardXMLCompletionItemFactory().preloadCompletionItems();
		console.log("XML Completion Items generated");
		await new SAPUIDefineFactory().preloadCompletionItems();
		console.log("JS Completion Items generated");

		const JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, {
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				let itemsToReturn: CustomCompletionItem[] = [];
				let completionItemFactory: ICompletionItemFactory | undefined;
				UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
				try {
					if (UIDefineCompletionItemGenerator.getIfCurrentPositionIsInDefine(document, position)) {
						completionItemFactory = AbstractCompletionItemFactory.getFactory(AbstractCompletionItemFactory.javascript.sapUiDefine);
					} else {
						completionItemFactory = AbstractCompletionItemFactory.getFactory(AbstractCompletionItemFactory.javascript.member);
					}
					itemsToReturn = await completionItemFactory?.createCompletionItems(document, position);

				} catch (error) {
					console.log(error);
				}
				// copy(JSON.stringify(itemsToReturn.map(item => item.insertText.value ? `"${item.insertText.value}"` : `"${item.insertText}"`)))
				return itemsToReturn;
			}
		}, ".", "\"", "'");

		const JSViewIDProvider = vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return AbstractCompletionItemFactory.getFactory(AbstractCompletionItemFactory.javascript.viewId).createCompletionItems(document, position);
			}
		}, "\"", "'");

		let i = 65;
		const aChars: string[] = [];
		for (i = 65; i <= 122; i++) {
			aChars.push(String.fromCharCode(i));
		}

		const XMLProvider = vscode.languages.registerCompletionItemProvider({ language: "xml", scheme: "file" }, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return AbstractCompletionItemFactory.getFactory(AbstractCompletionItemFactory.xml.dynamic).createCompletionItems(document, position);
			}
		}, "<", ":", "\"", "*", ...aChars);

		UI5Plugin.getInstance().addDisposable(XMLProvider);
		UI5Plugin.getInstance().addDisposable(JSMethodPropertyProvider);
		UI5Plugin.getInstance().addDisposable(JSViewIDProvider);
	}
}