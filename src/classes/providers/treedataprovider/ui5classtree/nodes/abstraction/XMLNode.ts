import * as vscode from "vscode";
import { IXMLFile } from "../../../../../utils/FileReader";
import { IHierarchicalTag } from "../../../../diagnostics/xml/xmllinter/parts/abstraction/Linter";
import LineColumn = require("line-column");
import { Node } from "./Node";

export abstract class XMLNode extends Node {
	readonly tag: IHierarchicalTag;
	readonly XMLFile: IXMLFile;
	constructor(tag: IHierarchicalTag, XMLFile: IXMLFile) {
		super();
		this.tag = tag;
		this.XMLFile = XMLFile;
		this.iconPath = this._buildIconPath("icon-variable.svg");
	}
	protected _addNavigationCommand() {
		const classUri = vscode.Uri.file(this.XMLFile.fsPath);
		const lineColumnStart = LineColumn(this.XMLFile.content).fromIndex(this.tag.positionBegin);
		const lineColumnEnd = LineColumn(this.XMLFile.content).fromIndex(this.tag.positionEnd);
		if (lineColumnStart && lineColumnEnd) {
			this.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [classUri, {
					selection: new vscode.Range(
						lineColumnStart.line - 1, lineColumnStart.col - 1,
						lineColumnEnd.line - 1, lineColumnEnd.col
					)
				}]
			};
		}
	}
}