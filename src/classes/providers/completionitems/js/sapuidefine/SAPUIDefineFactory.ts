import * as vscode from "vscode";
import { WorkspaceCompletionItemFactory } from "./WorkspaceCompletionItemFactory";
import { SAPNode } from "../../../../librarydata/SAPNode";
import { SAPNodeDAO } from "../../../../librarydata/SAPNodeDAO";
import { URLBuilder } from "../../../../utils/URLBuilder";
import { GeneratorFactory } from "../../codegenerators/GeneratorFactory";
import { CustomCompletionItem } from "../../CustomCompletionItem";

export class SAPUIDefineFactory {
	private static readonly _nodeDAO = new SAPNodeDAO();

	public async generateUIDefineCompletionItems() {
		const workspaceCompletionItemFactory = new WorkspaceCompletionItemFactory();
		let completionItems:CustomCompletionItem[] = [];

		const SAPNodes: SAPNode[] = await SAPUIDefineFactory._nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(this._recursiveUIDefineCompletionItemGeneration(node));
		}

		completionItems = completionItems.concat(await workspaceCompletionItemFactory.getCompletionItems());

		return completionItems;
	}

	private _recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems:CustomCompletionItem[] = [];
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
				completionItem.command = {command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define"};
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