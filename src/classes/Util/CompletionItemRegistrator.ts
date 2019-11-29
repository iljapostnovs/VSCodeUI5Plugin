import * as vscode from "vscode";
import { CompletionItemFactory } from "../CompletionItems/CompletionItemFactory";
import { GeneratorFactory } from "../CodeGenerators/GeneratorFactory";
import { UIClassFactory } from "../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { WorkspaceCompletionItemFactory } from "../CompletionItems/WorkspaceCompletionItemFactory";
import { DefineGenerator } from "../CodeGenerators/define/UIDefineCompletionItemGenerator";

export class CompletionItemRegistrator {
	static async register(context: vscode.ExtensionContext, progress: vscode.Progress<{message?: string | undefined;increment?: number | undefined;}>) {
		/* Completion Items */
		let XMLCompletionItemFactory = new CompletionItemFactory(GeneratorFactory.language.xml);
		let XMLCompletionItems = await XMLCompletionItemFactory.getLanguageSpecificCompletionItems(progress, context);
		console.log("XML Completion Items generated");

		let JSCompletionItemDAO = new CompletionItemFactory(GeneratorFactory.language.js);
		let JSDefineCompletionItems = await JSCompletionItemDAO.getLanguageSpecificCompletionItems(progress, context)
		console.log("JS Completion Items generated");

		let JSMethodPropertyProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				let itemsToReturn:vscode.CompletionItem[] = [];
				try {
					if (DefineGenerator.getIfCurrentPositionIsInDefine(position)) {
						itemsToReturn = JSDefineCompletionItems;
					}

					itemsToReturn = itemsToReturn.concat(JSCompletionItemDAO.generateUIClassCompletionItems());
				} catch (error) {
					console.log(error);
				}
				return itemsToReturn;
			}
		}, ".");

		let JSViewIDProvider = vscode.languages.registerCompletionItemProvider({language: "javascript", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return JSCompletionItemDAO.generateIdCompletionItems();
			}
		}, "this.getView().byId(");

		let XMLProvider = vscode.languages.registerCompletionItemProvider({language: "xml", scheme: "file"}, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				return XMLCompletionItems;
			}
		});

		context.subscriptions.push(XMLProvider);
		context.subscriptions.push(JSMethodPropertyProvider);
		context.subscriptions.push(JSViewIDProvider);

		WorkspaceCompletionItemFactory.subscribeToFileOpening((event: vscode.TextDocument) => {
			WorkspaceCompletionItemFactory.synchronise(JSDefineCompletionItems, event);
		});

		UIClassFactory.synchroniseCacheOnDocumentSave();
	}
}