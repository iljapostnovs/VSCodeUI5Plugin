import { UI5JSParser } from "ui5plugin-parser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ANode from "./abstraction/ANode";
import ConfigPathNode from "./project/ConfigPathNode";
import LinterSettingsNode from "./project/LinterSettingsNode";
import ManifestPathNode from "./project/ManifestPathNode";
import ParserSettingsNode from "./project/ParserSettingsNode";

export default class ProjectNode extends ANode {
	children: ANode[];
	constructor(parser: IUI5Parser) {
		const label = parser instanceof UI5JSParser ? "(JS)" : "(TS)";
		const appId = parser.fileReader.getAllManifests()[0]?.componentName;
		super(parser, `${label} ${appId}`);
		this.iconPath =
			parser instanceof UI5JSParser
				? this._buildIconPath("javascript.svg")
				: this._buildIconPath("typescript.svg");

		this.children = [
			new ConfigPathNode(parser),
			...parser.fileReader.getAllManifests().map(manifest => new ManifestPathNode(parser, manifest)),
			new ParserSettingsNode(parser),
			new LinterSettingsNode(parser)
		];
	}
}
