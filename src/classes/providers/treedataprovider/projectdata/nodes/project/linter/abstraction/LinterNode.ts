import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState, TreeItemLabel } from "vscode";
import ANode from "../../../abstraction/ANode";
import NodeLinterConfigHandler from "../config/NodeLinterConfigHandler";

export default abstract class LinterNode extends ANode {
	protected readonly _linterConfig: NodeLinterConfigHandler;
	constructor(parser: IUI5Parser, label: string | TreeItemLabel, collapsibleState?: TreeItemCollapsibleState) {
		super(parser, label, collapsibleState);
		this._linterConfig = new NodeLinterConfigHandler(parser, parser.configHandler.packagePath);
	}
}
