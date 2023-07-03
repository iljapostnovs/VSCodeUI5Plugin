import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import Linters from "./Linters";
import LinterNode from "./abstraction/LinterNode";

export default class SeverityNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Severity: ", TreeItemCollapsibleState.None);
		const severities = Linters.map(linter => ({
			linter: linter,
			severity: this._linterConfig.getSeverity(linter)
		}));
		this.label += JSON.stringify(severities);
		this.iconPath = this._buildIconPath("tune.svg");
	}
}
