import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import LinterNode from "./abstraction/LinterNode";

export default class ComponentsToExcludeNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Components to exclude: ", TreeItemCollapsibleState.None);
		this.label += JSON.stringify(this._linterConfig.config.ui5?.ui5linter?.componentsToExclude ?? []);
		this.iconPath = this._buildIconPath("folder-private.svg");
	}
}
