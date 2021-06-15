import * as vscode from "vscode";
import { IXMLFile } from "../../../../../../../utils/FileReader";
import { XMLParser } from "../../../../../../../utils/XMLParser";
import { ITag } from "../../../../../../diagnostics/xml/xmllinter/parts/abstraction/Linter";
import { XMLNode } from "../../../abstraction/XMLNode";

export class TagNode extends XMLNode {
	collapsibleState = vscode.TreeItemCollapsibleState.None;
	constructor(tag: ITag, XMLFile: IXMLFile) {
		super(tag, XMLFile);

		const className = XMLParser.getClassNameFromTag(tag.text);
		const fullClassName = XMLParser.getFullClassNameFromTag(tag, XMLFile);
		this.label = className;
		const idAttribute = XMLParser.getAttributesOfTheTag(tag)?.find(attribute => {
			const { attributeName } = XMLParser.getAttributeNameAndValue(attribute);
			return attributeName === "id";
		})
		const idAttributeValue = idAttribute && XMLParser.getAttributeNameAndValue(idAttribute).attributeValue;
		this.description = `(${fullClassName})${idAttributeValue ? ` - ${idAttributeValue}` : ""}`;
		this._addNavigationCommand();
	}
}