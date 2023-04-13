import { JSLinterErrorFactory } from "ui5plugin-linter";
import { UI5JSParser } from "ui5plugin-parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";
export class JSLinter extends JSLinterErrorFactory {
	constructor(parser: UI5JSParser) {
		super(parser, new VSCodeLinterConfigHandler(parser));
	}
}
