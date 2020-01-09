import * as vscode from "vscode";
import { CompletionItemFactory } from "../CompletionItems/CompletionItemFactory";
import { GeneratorFactory } from "../CodeGenerators/GeneratorFactory";
import { DefineGenerator } from "../CodeGenerators/define/UIDefineCompletionItemGenerator";
import { FileWatcher } from "./FileWatcher";

export class CompletionItemRegistrator {
	static async register(context: vscode.ExtensionContext, progress: vscode.Progress<{message?: string | undefined;increment?: number | undefined;}>) {
		/* Completion Items */
		const XMLCompletionItemFactory = new CompletionItemFactory(GeneratorFactory.language.xml);
		const XMLCompletionItems = await XMLCompletionItemFactory.getLanguageSpecificCompletionItems(progress, context);
		console.log("XML Completion Items generated");

		const JSCompletionItemDAO = new CompletionItemFactory(GeneratorFactory.language.js);
		const JSDefineCompletionItems = await JSCompletionItemDAO.getLanguageSpecificCompletionItems(progress, context)
		console.log("JS Completion Items generated");

		const JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				let itemsToReturn:vscode.CompletionItem[] = [];
				try {
					if (DefineGenerator.getIfCurrentPositionIsInDefine(position)) {
						itemsToReturn = JSDefineCompletionItems;
					} else {
						itemsToReturn = JSCompletionItemDAO.generateUIClassCompletionItems();
					}

				} catch (error) {
					console.log(error);
				}
				return itemsToReturn;
			}
		}, ".");

		const JSViewIDProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return JSCompletionItemDAO.generateIdCompletionItems();
			}
		}, "this.getView().byId(");

		const XMLProvider = vscode.languages.registerCompletionItemProvider({language: "xml", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return XMLCompletionItems;
			}
		});

		context.subscriptions.push(XMLProvider);
		context.subscriptions.push(JSMethodPropertyProvider);
		context.subscriptions.push(JSViewIDProvider);

		FileWatcher.syncrhoniseJSDefineCompletionItems(JSDefineCompletionItems);
	}
}