import { PropertiesLinterErrorFactory } from "ui5plugin-linter";
import { UI5Parser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class PropertiesLinter extends PropertiesLinterErrorFactory {
	constructor() {
		super(AbstractUI5Parser.getInstance(UI5Parser), new VSCodeLinterConfigHandler());
	}
}