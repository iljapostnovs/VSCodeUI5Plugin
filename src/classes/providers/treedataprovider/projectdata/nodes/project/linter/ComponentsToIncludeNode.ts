import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import LinterNode from "./abstraction/LinterNode";

export default class ComponentsToIncludeNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Components to include: ", TreeItemCollapsibleState.None);
		this.label += JSON.stringify(this._linterConfig.config.ui5?.ui5linter?.componentsToInclude ?? []);
		this.iconPath = this._buildIconPath("folder-src.svg");
	}
}
