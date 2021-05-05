import * as vscode from "vscode";
import { CompletionItemFactory } from "../providers/completionitems/CompletionItemFactory";
import { FileWatcherMediator } from "../utils/FileWatcherMediator";
import { UI5Plugin } from "../../UI5Plugin";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { UIDefineCompletionItemGenerator } from "../providers/completionitems/codegenerators/define/UIDefineCompletionItemGenerator";
import { GeneratorFactory } from "../providers/completionitems/codegenerators/GeneratorFactory";

export class CompletionItemRegistrator {
	static async register() {
		/* Completion Items */
		const XMLCompletionItemFactory = new CompletionItemFactory(GeneratorFactory.language.xml);
		await XMLCompletionItemFactory.createUIDefineCompletionItems();
		console.log("XML Completion Items generated");

		const JSCompletionItemFactory = new CompletionItemFactory(GeneratorFactory.language.js);
		await JSCompletionItemFactory.createUIDefineCompletionItems();
		console.log("JS Completion Items generated");

		const JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, {
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				let itemsToReturn: CustomCompletionItem[] = [];
				try {
					if (UIDefineCompletionItemGenerator.getIfCurrentPositionIsInDefine()) {
						itemsToReturn = await JSCompletionItemFactory.createUIDefineCompletionItems(document);
					} else {
						itemsToReturn = JSCompletionItemFactory.createPropertyMethodCompletionItems(document, position);
					}

				} catch (error) {
					console.log(error);
				}
				return itemsToReturn;
			}
		}, ".", "\"", "'");

		const JSViewIDProvider = vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return JSCompletionItemFactory.createViewIdCompletionItems(document, position);
			}
		}, "\"", "'");

		let i = 65;
		const aChars: string[] = [];
		for (i = 65; i <= 122; i++) {
			aChars.push(String.fromCharCode(i));
		}

		const XMLProvider = vscode.languages.registerCompletionItemProvider({ language: "xml", scheme: "file" }, {
			provideCompletionItems() {
				return XMLCompletionItemFactory.createXMLDynamicCompletionItems();
			}
		}, "<", ":", "\"", "*", ...aChars);

		UI5Plugin.getInstance().addDisposable(XMLProvider);
		UI5Plugin.getInstance().addDisposable(JSMethodPropertyProvider);
		UI5Plugin.getInstance().addDisposable(JSViewIDProvider);

		FileWatcherMediator.synchronizeSAPUIDefineCompletionItems(CompletionItemFactory.JSDefineCompletionItems);
	}
}