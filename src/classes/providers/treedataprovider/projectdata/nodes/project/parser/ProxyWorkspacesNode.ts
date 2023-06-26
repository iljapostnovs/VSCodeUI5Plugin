import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class ProxyWorkspacesNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, `Proxy Workspaces: ${JSON.stringify(parser.configHandler.getProxyWorkspaces())}`, TreeItemCollapsibleState.None);
		this.iconPath = this._buildIconPath("folder-src.svg");
	}
}
