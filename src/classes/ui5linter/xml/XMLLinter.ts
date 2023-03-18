import { XMLLinterErrorFactory } from "ui5plugin-linter";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class XMLLinter extends XMLLinterErrorFactory {
	constructor(parser: IUI5Parser) {
		super(parser, new VSCodeLinterConfigHandler(parser));
	}
}
