import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class ExcludeFolderPatternsNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(
			parser,
			`Exclude Folders: ${JSON.stringify(parser.configHandler.getExcludeFolderPatterns())}`,
			TreeItemCollapsibleState.None
		);
		this.iconPath = this._buildIconPath("folder-private.svg");
	}
}
