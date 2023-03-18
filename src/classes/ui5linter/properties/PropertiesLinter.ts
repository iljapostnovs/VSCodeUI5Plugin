import { PropertiesLinterErrorFactory } from "ui5plugin-linter";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class PropertiesLinter extends PropertiesLinterErrorFactory {
	constructor(parser: IUI5Parser) {
		super(parser, new VSCodeLinterConfigHandler(parser));
	}
}
