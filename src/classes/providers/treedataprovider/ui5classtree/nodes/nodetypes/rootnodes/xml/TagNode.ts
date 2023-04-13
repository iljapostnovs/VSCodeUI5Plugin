import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { IHierarchicalTag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { IParserBearer } from "../../../../../../../ui5parser/ParserBearer";
import { XMLNode } from "../../../abstraction/XMLNode";

export class TagNode extends XMLNode implements IParserBearer {
	_parser: IUI5Parser;
	collapsibleState: vscode.TreeItemCollapsibleState;
	constructor(tag: IHierarchicalTag, XMLFile: IXMLFile, parser: IUI5Parser) {
		super(tag, XMLFile, parser);
		this._parser = parser;

		this.collapsibleState =
			tag.tags.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
		const className = this._parser.xmlParser.getClassNameFromTag(tag.text);
		const fullClassName = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);
		this.label = className;
		const idAttribute = this._parser.xmlParser.getAttributesOfTheTag(tag)?.find(attribute => {
			const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
			return attributeName === "id";
		});
		const idAttributeValue =
			idAttribute && this._parser.xmlParser.getAttributeNameAndValue(idAttribute).attributeValue;
		this.description = `(${fullClassName})${idAttributeValue ? ` - ${idAttributeValue}` : ""}`;
		this._addNavigationCommand();
	}
}
