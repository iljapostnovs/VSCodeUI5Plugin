import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class UI5VersionNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, `UI5 Version: ${parser.configHandler.getUI5Version()}`, TreeItemCollapsibleState.None);
		this.iconPath = this._buildIconPath("ui5.svg");
	}
}
