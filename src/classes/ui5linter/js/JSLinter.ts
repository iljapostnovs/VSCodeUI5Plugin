import { JSLinterErrorFactory } from "ui5plugin-linter";
import { UI5Parser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";
export class JSLinter extends JSLinterErrorFactory {
	constructor() {
		super(AbstractUI5Parser.getInstance(UI5Parser), new VSCodeLinterConfigHandler());
	}
}