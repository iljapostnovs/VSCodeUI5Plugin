import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class RejectUnauthorizedNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, `Reject unauth.: ${parser.configHandler.getRejectUnauthorized()}`, TreeItemCollapsibleState.None);
		this.iconPath = this._buildIconPath("http.svg");
	}
}
