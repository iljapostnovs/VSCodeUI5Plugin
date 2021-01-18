import * as vscode from "vscode";
import { CompletionItemFactory } from "../providers/completionitems/CompletionItemFactory";
import { FileWatcherMediator } from "../utils/FileWatcherMediator";
import { UI5Plugin } from "../../UI5Plugin";
import { CustomCompletionItem } from "../providers/completionitems/CustomCompletionItem";
import { DefineGenerator } from "../providers/completionitems/codegenerators/define/UIDefineCompletionItemGenerator";
import { GeneratorFactory } from "../providers/completionitems/codegenerators/GeneratorFactory";

export class CompletionItemRegistrator {
	static async register() {
		/* Completion Items */
		const XMLCompletionItemFactory = new CompletionItemFactory(GeneratorFactory.language.xml);
		const XMLCompletionItems = await XMLCompletionItemFactory.getUIDefineCompletionItems();
		console.log("XML Completion Items generated");

		const JSCompletionItemDAO = new CompletionItemFactory(GeneratorFactory.language.js);
		await JSCompletionItemDAO.getUIDefineCompletionItems();
		console.log("JS Completion Items generated");

		const JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				let itemsToReturn:CustomCompletionItem[] = [];
				// console.time(`Position ${document.fileName} parsing took`);
				try {
					if (DefineGenerator.getIfCurrentPositionIsInDefine()) {
						itemsToReturn = await JSCompletionItemDAO.getUIDefineCompletionItems();
					} else {
						itemsToReturn = JSCompletionItemDAO.generatePropertyMethodCompletionItems();
					}

				} catch (error) {
					console.log(error);
				}
				// console.timeEnd(`Position ${document.fileName} parsing took`);
				return itemsToReturn;
			}
		}, ".", "\"");

		const JSViewIDProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return JSCompletionItemDAO.generateViewIdCompletionItems();
			}
		}, "\"");

		let i = 65;
		const aChars: string[] = [];
		for (i = 65; i <= 122; i++) {
			aChars.push(String.fromCharCode(i));
		}

		const XMLProvider = vscode.languages.registerCompletionItemProvider({language: "xml", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return XMLCompletionItemFactory.generateXMLDynamicCompletionItems();
			}
		}, "<", ":", "\"", "*", ...aChars);

		UI5Plugin.getInstance().addDisposable(XMLProvider);
		UI5Plugin.getInstance().addDisposable(JSMethodPropertyProvider);
		UI5Plugin.getInstance().addDisposable(JSViewIDProvider);

		FileWatcherMediator.synchronizeJSDefineCompletionItems(CompletionItemFactory.JSDefineCompletionItems);
	}
}