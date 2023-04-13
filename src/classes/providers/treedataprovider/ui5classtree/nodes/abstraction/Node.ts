import * as path from "path";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { IParserBearer } from "../../../../../ui5parser/ParserBearer";
import { RootNode } from "./RootNode";
export abstract class Node extends vscode.TreeItem implements IParserBearer {
	parent: Node | RootNode | null = null;
	_parser: IUI5Parser;
	constructor(parser: IUI5Parser) {
		super("");
		this._parser = parser;
	}
	protected _buildIconPath(iconPath: string) {
		const extensionPath = vscode.extensions.getExtension("iljapostnovs.ui5plugin")?.extensionPath;
		return extensionPath && path.join(extensionPath, `./icons/${iconPath}`);
	}
}
