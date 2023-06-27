import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import LinterNode from "./abstraction/LinterNode";

export default class AttributesToCheckNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Attributes to check: ", TreeItemCollapsibleState.None);
		this.label += JSON.stringify(this._linterConfig.getAttributesToCheck());
		this.iconPath = this._buildIconPath("regexp.svg");
	}
}
