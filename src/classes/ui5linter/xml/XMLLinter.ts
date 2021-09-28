import { XMLLinterErrorFactory } from "ui5plugin-linter";
import { UI5Plugin } from "../../../UI5Plugin";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class XMLLinter extends XMLLinterErrorFactory {
	constructor() {
		super(UI5Plugin.getInstance().parser, new VSCodeLinterConfigHandler());
	}
}