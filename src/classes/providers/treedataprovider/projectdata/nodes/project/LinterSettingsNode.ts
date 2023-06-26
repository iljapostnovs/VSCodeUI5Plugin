import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import ANode from "../abstraction/ANode";
import AttributesToCheckNode from "./linter/AttributesToCheckNode";
import ComponentsToExcludeNode from "./linter/ComponentsToExcludeNode";
import ComponentsToIncludeNode from "./linter/ComponentsToIncludeNode";
import EventNamingPatternNode from "./linter/EventNamingPatternNode";
import IDNamingPatternNode from "./linter/IDNamingPatternNode";
import JSLinterExceptionsNode from "./linter/JSLinterExceptionsNode";
import PropertiesExceptionsNode from "./linter/PropertiesExceptionsNode";
import XMLLinterExceptionsNode from "./linter/XMLClassExceptionsNode";
import SeverityNode from "./linter/SeverityNode";
import UsageNode from "./linter/UsageNode";
export default class LinterSettingsNode extends ANode {
	children: ANode[];
	constructor(parser: IUI5Parser) {
		super(parser, "Linter settings");

		this.children = [
			new ComponentsToIncludeNode(parser),
			new ComponentsToExcludeNode(parser),
			new JSLinterExceptionsNode(parser),
			new XMLLinterExceptionsNode(parser),
			new PropertiesExceptionsNode(parser),
			new AttributesToCheckNode(parser),
			new EventNamingPatternNode(parser),
			new IDNamingPatternNode(parser),
			new SeverityNode(parser),
			new UsageNode(parser)
		];
	}
}
