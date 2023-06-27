import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ANode from "../abstraction/ANode";
import AdditionalWorkspacesNode from "./parser/AdditionalWorkspacesNode";
import DataSourceNode from "./parser/DataSourceNode";
import ExcludeFolderPatternsNode from "./parser/ExcludeFolderPatternsNode";
import LibsToLoadNode from "./parser/LibsToLoadNode";
import RejectUnauthorizedNode from "./parser/RejectUnauthorizedNode";
import UI5VersionNode from "./parser/UI5VersionNode";
export default class ParserSettingsNode extends ANode {
	children: ANode[];
	constructor(parser: IUI5Parser) {
		super(parser, "Parser settings");

		this.children = [
			new UI5VersionNode(parser),
			new DataSourceNode(parser),
			new RejectUnauthorizedNode(parser),
			new AdditionalWorkspacesNode(parser),
			new ExcludeFolderPatternsNode(parser),
			new LibsToLoadNode(parser)
			// new ProxyWorkspacesNode(parser),
		];
	}
}
