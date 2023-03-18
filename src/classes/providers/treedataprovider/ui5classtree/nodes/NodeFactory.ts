import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../../ui5parser/ParserBearer";
import { Node } from "./abstraction/Node";
import { RootNode } from "./abstraction/RootNode";
import { XMLNode } from "./abstraction/XMLNode";
import { ClassNameNode } from "./nodetypes/rootnodes/js/ClassNameNode";
import { FieldsNode } from "./nodetypes/rootnodes/js/FieldsNode";
import { MethodsNode } from "./nodetypes/rootnodes/js/MethodsNode";
import { TagNode } from "./nodetypes/rootnodes/xml/TagNode";
import { FieldNode } from "./nodetypes/subnodes/js/field/FieldNode";
import { MethodLinesNode } from "./nodetypes/subnodes/js/method/MethodLinesNode";
import { MethodNode } from "./nodetypes/subnodes/js/method/MethodNode";
import { MethodReferencesNode } from "./nodetypes/subnodes/js/method/MethodReferencesNode";
import { VisibilityNode } from "./nodetypes/subnodes/js/VisibilityNode";

export class NodeFactory extends ParserBearer {
	getNodes(node?: Node) {
		const nodes: Node[] = [];

		if (!node) {
			nodes.push(...this._getRootNodes());
		} else {
			nodes.push(...this._getSubNodes(node));
		}

		return nodes;
	}
	private _getRootNodes() {
		const rootNodes: (RootNode | XMLNode)[] = [];

		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument?.fileName.endsWith(".js") || currentDocument?.fileName.endsWith(".ts")) {
			const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(
				new TextDocumentAdapter(currentDocument)
			);
			if (UIClass) {
				rootNodes.push(new ClassNameNode(UIClass, this._parser));
				rootNodes.push(new MethodsNode(UIClass, this._parser));
				rootNodes.push(new FieldsNode(UIClass, this._parser));
			}
		} else if (
			currentDocument?.fileName.endsWith(".fragment.xml") ||
			currentDocument?.fileName.endsWith(".view.xml")
		) {
			const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(currentDocument));
			if (XMLFile) {
				const hierarchicalTags = this._parser.xmlParser.getTagHierarchy(XMLFile);
				const tagNodes = hierarchicalTags.map(tag => new TagNode(tag, XMLFile, this._parser));
				rootNodes.push(...tagNodes);
			}
		}

		return rootNodes;
	}

	private _getSubNodes(node: Node) {
		const nodes: Node[] = [];

		if (node instanceof MethodsNode) {
			nodes.push(...this._getMethodNodes(node));
		} else if (node instanceof FieldsNode) {
			nodes.push(
				...node.UIClass.fields
					.map(UIField => new FieldNode(UIField, this._parser))
					.filter(node => node.UIField.name !== "prototype")
			);
		} else if (node instanceof MethodNode) {
			const childNodes = [
				new MethodLinesNode(node.UIMethod, this._parser),
				new MethodReferencesNode(node.UIMethod, this._parser),
				new VisibilityNode(node.UIMethod, this._parser)
			];
			nodes.push(...childNodes);
		} else if (node instanceof FieldNode) {
			const childNodes = [new VisibilityNode(node.UIField, this._parser)];
			nodes.push(...childNodes);
		} else if (node instanceof TagNode) {
			const childNodes = node.tag.tags.map(tag => new TagNode(tag, node.XMLFile, this._parser));
			nodes.push(...childNodes);
		}

		nodes.forEach(node => {
			node.parent = node;
		});
		return nodes;
	}
	private _getMethodNodes(node: MethodsNode) {
		return node.UIClass.methods
			.filter(method => !!method.node)
			.map(UIMethod => new MethodNode(UIMethod, this._parser));
	}
}
