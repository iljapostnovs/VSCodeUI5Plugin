import { ParserPool } from "ui5plugin-parser";
import * as vscode from "vscode";
import ProjectNode from "./nodes/ProjectNode";
import ANode from "./nodes/abstraction/ANode";
export class ProjectDataTreeProvider implements vscode.TreeDataProvider<ANode> {
	private readonly _onDidChangeTreeData: vscode.EventEmitter<ANode | undefined | null | void> =
		new vscode.EventEmitter<ANode | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ANode | undefined | null | void> = this._onDidChangeTreeData.event;
	getTreeItem(element: ANode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		// if (this._expandAll && element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
		// element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		// }

		return element;
	}
	getChildren(element?: ANode): vscode.ProviderResult<ANode[]> {
		if (!element) {
			const parsers = ParserPool.getAllParsers();
			return parsers.map(parser => new ProjectNode(parser));
		} else {
			return element.children;
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
