import { TSLinterErrorFactory } from "ui5plugin-linter";
import { UI5TSParser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";
export class TSLinter extends TSLinterErrorFactory {
	constructor() {
		super(AbstractUI5Parser.getInstance(UI5TSParser), new VSCodeLinterConfigHandler());
	}
}