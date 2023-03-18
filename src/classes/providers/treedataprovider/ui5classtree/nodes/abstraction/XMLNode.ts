import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { IHierarchicalTag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../../adapters/vscode/RangeAdapter";
import { Node } from "./Node";

export abstract class XMLNode extends Node {
	readonly tag: IHierarchicalTag;
	readonly XMLFile: IXMLFile;
	constructor(tag: IHierarchicalTag, XMLFile: IXMLFile, parser: IUI5Parser) {
		super(parser);
		this.tag = tag;
		this.XMLFile = XMLFile;
		this.iconPath = this._buildIconPath("icon-variable.svg");
	}
	protected _addNavigationCommand() {
		const classUri = vscode.Uri.file(this.XMLFile.fsPath);
		const range = RangeAdapter.offsetsToVSCodeRange(
			this.XMLFile.content,
			this.tag.positionBegin,
			this.tag.positionEnd
		);
		if (range) {
			this.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [
					classUri,
					{
						selection: range
					}
				]
			};
		}
	}
}
