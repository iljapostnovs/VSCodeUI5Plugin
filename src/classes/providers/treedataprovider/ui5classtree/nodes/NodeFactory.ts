import { Node } from "./abstraction/Node";
import * as vscode from "vscode";
import { TextDocumentTransformer } from "../../../../utils/TextDocumentTransformer";
import { ClassNameNode } from "./nodetypes/rootnodes/js/ClassNameNode";
import { RootNode } from "./abstraction/RootNode";
import { XMLParser } from "../../../../utils/XMLParser";
import { FieldsNode } from "./nodetypes/rootnodes/js/FieldsNode";
import { MethodsNode } from "./nodetypes/rootnodes/js/MethodsNode";
import { FieldNode } from "./nodetypes/subnodes/js/field/FieldNode";
import { MethodLinesNode } from "./nodetypes/subnodes/js/method/MethodLinesNode";
import { MethodNode } from "./nodetypes/subnodes/js/method/MethodNode";
import { MethodReferencesNode } from "./nodetypes/subnodes/js/method/MethodReferencesNode";
import { VisibilityNode } from "./nodetypes/subnodes/js/VisibilityNode";

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
		} else if (currentDocument?.fileName.endsWith(".xml")) {
			const XMLDocument = TextDocumentTransformer.toXMLFile(currentDocument);
			if (XMLDocument) {
				const allTags = XMLParser.getAllTags(XMLDocument);
				const allOpenedTags = allTags.filter(tag => {
					return !tag.text.startsWith("</")
				});
				
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