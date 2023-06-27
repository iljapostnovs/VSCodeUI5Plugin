import { IUIManifest } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../abstraction/ANode";
import path = require("path");

export default class ManifestPathNode extends ANode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser, manifest: IUIManifest) {
		const manifestPath = manifest.fsPath;
		super(parser, `Manifest: ${path.join(manifestPath, "manifest.json")}`);
		this.iconPath = this._buildIconPath("json.svg");
	}

	collapsibleState = TreeItemCollapsibleState.None;
}
