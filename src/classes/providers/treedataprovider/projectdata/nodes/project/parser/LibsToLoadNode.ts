import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";

export default class LibsToLoadNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(
			parser,
			`Libs To load: ${JSON.stringify(parser.configHandler.getLibsToLoad())}`,
			TreeItemCollapsibleState.None
		);
		this.iconPath = this._buildIconPath("folder-lib.svg");
	}
}
