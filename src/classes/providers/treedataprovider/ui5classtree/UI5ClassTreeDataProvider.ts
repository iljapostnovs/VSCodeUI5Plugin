import * as vscode from "vscode";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { Node } from "./nodes/abstraction/Node";
import { RootNode } from "./nodes/abstraction/RootNode";
import { NodeFactory } from "./nodes/NodeFactory";
export class UI5ClassTreeDataProvider implements vscode.TreeDataProvider<Node> {
	private _expandAll = false;
	rootNodes: RootNode[] = [];
	private readonly _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | null | void> =
		new vscode.EventEmitter<Node | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<Node | undefined | null | void> = this._onDidChangeTreeData.event;
	getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
		if (this._expandAll && element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
			element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}

		return element;
	}
	getChildren(element?: Node): vscode.ProviderResult<Node[]> {
		const parser = ReusableMethods.getParserForCurrentActiveDocument();

		if (!parser) {
			return [];
		}
		const children = new NodeFactory(parser).getNodes(element);

		children.forEach(child => {
			if (this._expandAll && child.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
				child.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
			}
		});

		if (!element) {
			const childrenAsRootNodes = children as RootNode[];
			this.rootNodes = childrenAsRootNodes;
		}

		return children;
	}

	getParent(element: Node) {
		if (element instanceof Node) {
			return element.parent;
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	expandAll() {
		this._expandAll = true;
		this.refresh();
	}

	collapseAll() {
		this._expandAll = false;
		this.refresh();
	}
}
