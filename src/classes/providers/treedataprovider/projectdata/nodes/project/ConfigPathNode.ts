import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../abstraction/ANode";

export default class ConfigPathNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		const configPath = parser.configHandler.configPath ?? "";
		super(parser, `Config: ${configPath}`, TreeItemCollapsibleState.None);
		this.iconPath = this._buildIconPath("settings.svg");
	}
}
