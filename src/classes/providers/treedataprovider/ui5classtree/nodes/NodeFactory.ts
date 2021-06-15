import { Node } from "./abstraction/Node";
import * as vscode from "vscode";
import { TextDocumentTransformer } from "../../../../utils/TextDocumentTransformer";
import { ClassNameNode } from "./nodetypes/rootnodes/ClassNameNode";
import { MethodsNode } from "./nodetypes/rootnodes/MethodsNode";
import { FieldsNode } from "./nodetypes/rootnodes/FieldsNode";
import { RootNode } from "./abstraction/RootNode";
import { MethodNode } from "./nodetypes/subnodes/method/MethodNode";
import { MethodLinesNode } from "./nodetypes/subnodes/method/MethodLinesNode";
import { MethodReferencesNode } from "./nodetypes/subnodes/method/MethodReferencesNode";
import { FieldNode } from "./nodetypes/subnodes/field/FieldNode";
import { VisibilityNode } from "./nodetypes/subnodes/VisibilityNode";

export class NodeFactory {
	static getNodes(node?: (Node | RootNode)) {
		const nodes: (Node | RootNode)[] = [];

		if (!node) {
			nodes.push(...this._getRootNodes());
		} else {
			nodes.push(...this._getSubNodes(node));
		}

		return nodes;
	}
	private static _getRootNodes() {
		const rootNodes: RootNode[] = [];

		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument?.fileName.endsWith(".js")) {
			const UIClass = TextDocumentTransformer.toCustomUIClass(currentDocument);
			if (UIClass) {
				rootNodes.push(new ClassNameNode(UIClass));
				rootNodes.push(new MethodsNode(UIClass));
				rootNodes.push(new FieldsNode(UIClass));
			}
		}

		return rootNodes;
	}

	private static _getSubNodes(node: Node | RootNode) {
		const nodes: Node[] = [];

		if (node instanceof MethodsNode) {
			nodes.push(...this._getMethodNodes(node));
		} else if (node instanceof FieldsNode) {
			nodes.push(...node.UIClass.fields.map(UIField => new FieldNode(UIField)).filter(node => node.UIField.name !== "prototype"));
		} else if (node instanceof MethodNode) {
			const childNodes = [
				new MethodLinesNode(node.UIMethod),
				new MethodReferencesNode(node.UIMethod),
				new VisibilityNode(node.UIMethod)
			];
			nodes.push(...childNodes);
		} else if (node instanceof FieldNode) {
			const childNodes = [
				new VisibilityNode(node.UIField)
			];
			nodes.push(...childNodes);
		}

		nodes.forEach(node => {
			node.parent = node;
		});
		return nodes;
	}
	private static _getMethodNodes(node: MethodsNode) {
		return node.UIClass.methods.map(UIMethod => new MethodNode(UIMethod));
	}
}