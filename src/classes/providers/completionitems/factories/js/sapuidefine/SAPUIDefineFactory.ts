import { UI5JSParser } from "ui5plugin-parser";
import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import HTMLMarkdown from "../../../../../utils/HTMLMarkdown";
import { CustomCompletionItem } from "../../../CustomCompletionItem";
import { GeneratorFactory } from "../../../codegenerators/GeneratorFactory";
import { ICompletionItemFactory } from "../../abstraction/ICompletionItemFactory";
import { WorkspaceCompletionItemFactory } from "./WorkspaceCompletionItemFactory";
export class SAPUIDefineFactory extends ParserBearer<UI5JSParser> implements ICompletionItemFactory {
	async createCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		let completionItems = await this.generateUIDefineCompletionItems();

		if (document && position) {
			this._parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document));
			const offset = document.offsetAt(position);
			const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
			if (UIClass instanceof CustomJSClass && UIClass?.fileContent) {
				const args = UIClass.fileContent?.body[0]?.expression?.arguments;
				if (args && args.length === 2) {
					const UIDefinePaths: string[] = args[0].elements || [];
					const node = this._parser.syntaxAnalyser.findAcornNode(UIDefinePaths, offset);
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

	public async generateUIDefineCompletionItems() {
		const workspaceCompletionItemFactory = this._parser.getCustomData<WorkspaceCompletionItemFactory>(
			"WorkspaceCompletionItemFactory"
		);
		let completionItems: CustomCompletionItem[] = [];

		const SAPNodes: SAPNode[] = await this._parser.nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(this._recursiveUIDefineCompletionItemGeneration(node));
		}

		const workspaceCompletionItems = (await workspaceCompletionItemFactory?.createCompletionItems()) ?? [];

		completionItems = completionItems.concat(workspaceCompletionItems);
		// copy(JSON.stringify(completionItems.map(item => item.insertText)))
		return completionItems;
	}

	private _recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems: CustomCompletionItem[] = [];
		const DefineGenerator = GeneratorFactory.getDefineGenerator();
		const insertText = new DefineGenerator(this._parser).generateDefineString(node);

		if (insertText) {
			const metadata = node.getMetadata();

			const completionItem = new CustomCompletionItem(insertText);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = insertText;
			completionItem.className = node.getName();
			completionItem.detail = metadata.rawMetadata.title;

			const markdownString = new HTMLMarkdown();
			markdownString.isTrusted = true;
			markdownString.appendMarkdown(this._parser.urlBuilder.getMarkupUrlForClassApi(node));
			markdownString.appendMarkdown(metadata.rawMetadata.description);
			completionItem.documentation = markdownString;

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
