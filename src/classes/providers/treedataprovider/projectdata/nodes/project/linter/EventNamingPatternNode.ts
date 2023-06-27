import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import LinterNode from "./abstraction/LinterNode";

export default class EventNamingPatternNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Event naming pattern: ", TreeItemCollapsibleState.None);
		this.label += this._linterConfig.getEventNamingPattern();
		this.iconPath = this._buildIconPath("regexp.svg");
	}
}
