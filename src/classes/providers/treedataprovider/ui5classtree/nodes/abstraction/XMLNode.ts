import * as vscode from "vscode";
import { Node } from "./Node";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { IHierarchicalTag } from "ui5plugin-parser/dist/classes/utils/XMLParser";

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
		const range = RangeAdapter.offsetsToVSCodeRange(this.XMLFile.content, this.tag.positionBegin, this.tag.positionEnd);
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