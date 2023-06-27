import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItem, TreeItemCollapsibleState, TreeItemLabel, extensions } from "vscode";
import { IParserBearer } from "../../../../../ui5parser/ParserBearer";
import path = require("path");

export default abstract class ANode extends TreeItem implements IParserBearer {
	_parser: IUI5Parser;
	abstract children: ANode[];
	protected _copyCommandContent = "";
	constructor(
		parser: IUI5Parser,
		label: string | TreeItemLabel,
		collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded
	) {
		super(label, collapsibleState);
		this._parser = parser;
		// this.command = {
		// 	title: "Open content",
		// 	command: "ui5plugin.openNewDocument",
		// 	arguments: [this._copyCommandContent, "json"]
		// };
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}
