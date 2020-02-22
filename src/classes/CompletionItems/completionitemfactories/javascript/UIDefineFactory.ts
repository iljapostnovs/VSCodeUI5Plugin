import * as vscode from "vscode";
import { WorkspaceCompletionItemFactory } from "../WorkspaceCompletionItemFactory";
import { SAPNode } from "../../../StandardLibMetadata/SAPNode";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { GeneratorFactory } from "../../../CodeGenerators/GeneratorFactory";
import { URLBuilder } from "../../../Util/URLBuilder";

export class UIDefineFactory {
	private readonly nodeDAO = new SAPNodeDAO();

	public async generateUIDefineCompletionItems() {
		const workspaceCompletionItemDAO = new WorkspaceCompletionItemFactory();
		let completionItems:vscode.CompletionItem[] = [];

		const SAPNodes: SAPNode[] = await this.nodeDAO.getAllNodes();

		for (const node of SAPNodes) {
			completionItems = completionItems.concat(await this.recursiveUIDefineCompletionItemGeneration(node));
		}

		completionItems = completionItems.concat(await workspaceCompletionItemDAO.getCompletionItems());

		return completionItems;
	}

	private async recursiveUIDefineCompletionItemGeneration(node: SAPNode) {
		let completionItems:vscode.CompletionItem[] = [];
		const defineGenerator = GeneratorFactory.getDefineGenerator();
		const insertText = await defineGenerator.generateDefineString(node);

		if (insertText) {
			const metadata = node.getMetadata();

			const completionItem = new vscode.CompletionItem(insertText);
			completionItem.kind = vscode.CompletionItemKind.Class;
			completionItem.insertText = insertText;
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
				completionItems = completionItems.concat(await this.recursiveUIDefineCompletionItemGeneration(nextNode));
			}
		}

		return completionItems;
	}
}