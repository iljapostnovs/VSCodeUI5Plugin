import { JSLinterErrorFactory } from "ui5plugin-linter";
import { UI5Plugin } from "../../../UI5Plugin";
import { VSCodeLinterConfigHandler } from "../config/VSCodeLinterConfigHandler";
export class JSLinter extends JSLinterErrorFactory {
	constructor() {
		super(UI5Plugin.getInstance().parser, new VSCodeLinterConfigHandler());
	}
}