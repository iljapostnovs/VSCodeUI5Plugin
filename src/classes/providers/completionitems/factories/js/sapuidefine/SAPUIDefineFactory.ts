import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { SAPNodeDAO } from "ui5plugin-parser/dist/classes/librarydata/SAPNodeDAO";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../../../adapters/vscode/TextDocumentAdapter";
import { FileWatcherMediator } from "../../../../../utils/FileWatcherMediator";
import { GeneratorFactory } from "../../../codegenerators/GeneratorFactory";
import { CustomCompletionItem } from "../../../CustomCompletionItem";
import { ICompletionItemFactory } from "../../abstraction/ICompletionItemFactory";
import { WorkspaceCompletionItemFactory } from "./WorkspaceCompletionItemFactory";
import { URLBuilder } from "ui5plugin-parser/dist/classes/utils/URLBuilder";
import { UI5Parser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
export class SAPUIDefineFactory implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems = SAPUIDefineFactory.JSDefineCompletionItems;

		if (document && position) {
			UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(
				new TextDocumentAdapter(document)
			);
			const offset = document.offsetAt(position);
			const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
			if (UIClass instanceof CustomUIClass && UIClass?.fileContent) {
				const args = UIClass.fileContent?.body[0]?.expression?.arguments;
				if (args && args.length === 2) {
					const UIDefinePaths: string[] = args[0].elements || [];
					const node = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findAcornNode(
						UIDefinePaths,
						offset
					);
					const isString = node?.type === "Literal";
					if (isString) {
						completionItems = completionItems.map(completionItem => {
							const completionItemWOQuotes = new CustomCompletionItem(completionItem.label);
							completionItemWOQuotes.kind = completionItem.kind;
							completionItemWOQuotes.className = completionItem.className;
							completionItemWOQuotes.insertText = (<any>completionItem.insertText).substring(
								1,
								(<any>completionItem.insertText).length - 1
							);
							completionItemWOQuotes.documentation = completionItem.documentation;
							completionItemWOQuotes.command = completionItem.command;

							return completionItemWOQuotes;
						});
					}
				}
			}
		}

		return completionItems;
	}
	public static JSDefineCompletionItems: CustomCompletionItem[] = [];
	async preloadCompletionItems() {
		SAPUIDefineFactory.JSDefineCompletionItems = await this.generateUIDefineCompletionItems();
		FileWatcherMediator.synchronizeSAPUIDefineCompletionItems(SAPUIDefineFactory.JSDefineCompletionItems);
	}
	private static readonly _nodeDAO = new SAPNodeDAO();

	public async generateUIDefineCompletionItems() {
		const workspaceCompletionItemFactory = new WorkspaceCompletionItemFactory();
		let completionItems: CustomCompletionItem[] = [];

		const SAPNodes: SAPNode[] = await SAPUIDefineFactory._nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(this._recursiveUIDefineCompletionItemGeneration(node));
		}

		completionItems = completionItems.concat(await workspaceCompletionItemFactory.createCompletionItems());
		// copy(JSON.stringify(completionItems.map(item => item.insertText)))
		return completionItems;
	}

	private _recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems: CustomCompletionItem[] = [];
		const defineGenerator = GeneratorFactory.getDefineGenerator();
		const insertText = defineGenerator.generateDefineString(node);

		if (insertText) {
			const metadata = node.getMetadata();

			const completionItem = new CustomCompletionItem(insertText);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = insertText;
			completionItem.className = node.getName();
			completionItem.detail = metadata.rawMetadata.title;

			const mardownString = new vscode.MarkdownString();
			mardownString.isTrusted = true;
			mardownString.appendMarkdown(URLBuilder.getInstance().getMarkupUrlForClassApi(node));
			mardownString.appendMarkdown(metadata.rawMetadata.description);
			completionItem.documentation = mardownString;

			if (vscode.workspace.getConfiguration("ui5.plugin").get("moveDefineToFunctionParametersOnAutocomplete")) {
				completionItem.command = {
					command: "ui5plugin.moveDefineToFunctionParameters",
					title: "Add to UI Define"
				};
			}

			completionItems.push(completionItem);
		}

		if (node.nodes) {
			for (const nextNode of node.nodes) {
				completionItems = completionItems.concat(this._recursiveUIDefineCompletionItemGeneration(nextNode));
			}
		}

		return completionItems;
	}
}
