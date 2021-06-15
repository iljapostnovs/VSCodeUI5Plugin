import * as vscode from "vscode";
import { Node } from "./nodes/abstraction/Node";
import { RootNode } from "./nodes/abstraction/RootNode";
import { XMLNode } from "./nodes/abstraction/XMLNode";
import { NodeFactory } from "./nodes/NodeFactory";
export class UI5ClassTreeDataProvider implements vscode.TreeDataProvider<(Node | RootNode | XMLNode)> {
	private _expandAll = false;
	rootNodes: RootNode[] = [];
	private readonly _onDidChangeTreeData: vscode.EventEmitter<(Node | RootNode | XMLNode) | undefined | null | void> = new vscode.EventEmitter<(Node | RootNode | XMLNode) | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<(Node | RootNode | XMLNode) | undefined | null | void> = this._onDidChangeTreeData.event;
	getTreeItem(element: (Node | RootNode | XMLNode)): vscode.TreeItem | Thenable<vscode.TreeItem> {
		if (this._expandAll && element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
			element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}

		return element;
	}
	getChildren(element?: (Node | RootNode | XMLNode)): vscode.ProviderResult<(Node | RootNode | XMLNode)[]> {
		const children = NodeFactory.getNodes(element);

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

	getParent(element: (Node | RootNode | XMLNode)) {
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