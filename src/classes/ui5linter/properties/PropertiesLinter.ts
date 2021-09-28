import { PropertiesLinterErrorFactory } from "ui5plugin-linter";
import { UI5Plugin } from "../../../UI5Plugin";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";

export class PropertiesLinter extends PropertiesLinterErrorFactory {
	constructor() {
		super(UI5Plugin.getInstance().parser, new VSCodeLinterConfigHandler());
	}
}