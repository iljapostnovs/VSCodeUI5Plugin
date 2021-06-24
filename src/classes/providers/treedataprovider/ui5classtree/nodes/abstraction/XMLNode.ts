import * as vscode from "vscode";
import { IXMLFile } from "../../../../../utils/FileReader";
import { IHierarchicalTag } from "../../../../diagnostics/xml/xmllinter/parts/abstraction/Linter";
import { Node } from "./Node";
import { Util } from "../../../../../utils/Util";

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
		const range = Util.positionsToVSCodeRange(this.XMLFile.content, this.tag.positionBegin, this.tag.positionEnd);
		if (range) {
			this.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [classUri, {
					selection: range
				}]
			};
		}
	}
}