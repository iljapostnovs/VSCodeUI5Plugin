import { PackageLinterConfigHandler } from "ui5plugin-linter";
import { IUI5PackageConfigEntry } from "ui5plugin-linter/dist/classes/config/PackageLinterConfigHandler";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";

export default class NodeLinterConfigHandler extends PackageLinterConfigHandler {
	readonly config: IUI5PackageConfigEntry;
	constructor(parser: IUI5Parser, packagePath?: string | undefined) {
		super(parser, packagePath);
		this.config = this._config;
	}
}
