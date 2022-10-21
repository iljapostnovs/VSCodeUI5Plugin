import { XMLLinterErrorFactory } from "ui5plugin-linter";
import { UI5Parser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class XMLLinter extends XMLLinterErrorFactory {
	constructor() {
		super(AbstractUI5Parser.getInstance(UI5Parser), new VSCodeLinterConfigHandler());
	}
}