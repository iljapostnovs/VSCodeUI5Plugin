import * as vscode from "vscode";
import { IXMLFile } from "../../../../../utils/FileReader";
import { ITag } from "../../../../diagnostics/xml/xmllinter/parts/abstraction/Linter";
import LineColumn = require("line-column");
import * as path from "path";

export abstract class XMLNode extends vscode.TreeItem {
	readonly tag: ITag;
	readonly XMLFile: IXMLFile;
	constructor(tag: ITag, XMLFile: IXMLFile) {
		super("");
		this.tag = tag;
		this.XMLFile = XMLFile;
		this.iconPath = path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "icons", "icon-variable.svg");
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