import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class AdditionalWorkspacesNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(
			parser,
			`AdditionalWorkspaces: ${JSON.stringify(parser.configHandler.getAdditionalWorkspaces())}`,
			TreeItemCollapsibleState.None
		);
		this.iconPath = this._buildIconPath("folder-src.svg");
	}
}
