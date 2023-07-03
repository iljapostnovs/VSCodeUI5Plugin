import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import Linters from "./Linters";
import LinterNode from "./abstraction/LinterNode";

export default class UsageNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Usage: ", TreeItemCollapsibleState.None);
		const severities = Linters.map(linter => ({
			linter: linter,
			used: this._linterConfig.getLinterUsage(linter)
		}));
		this.label += JSON.stringify(severities);
		this.iconPath = this._buildIconPath("question-mark.svg");
	}
}
