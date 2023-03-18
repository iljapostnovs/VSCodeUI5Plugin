import { TSLinterErrorFactory } from "ui5plugin-linter";
import { UI5TSParser } from "ui5plugin-parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";
export class TSLinter extends TSLinterErrorFactory {
	constructor(parser: UI5TSParser) {
		super(parser, new VSCodeLinterConfigHandler(parser));
	}
}
