import { ILinterConfigHandler, PackageLinterConfigHandler, Severity } from "ui5plugin-linter";
import { JSLinters, XMLLinters, PropertiesLinters } from "ui5plugin-linter/dist/classes/Linter";
import { TextDocument } from "ui5plugin-parser";
import { UI5Plugin } from "../../../UI5Plugin";
import * as vscode from "vscode";
import path = require("path");
import { JSLinterException } from "ui5plugin-linter/dist/classes/config/ILinterConfigHandler";

export class VSCodeLinterConfigHandler implements ILinterConfigHandler {
	private readonly _packageLinterConfigHandler: PackageLinterConfigHandler;
	constructor() {
		const currentDocumentFilePath = vscode.window.activeTextEditor?.document.fileName;
		const className = currentDocumentFilePath && UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(currentDocumentFilePath);
		const manifest = className && UI5Plugin.getInstance().parser.fileReader.getManifestForClass(className);

		let packagePath: string | undefined;
		if (manifest) {
			const dirname = path.dirname(manifest.fsPath);
			packagePath = path.join(dirname, "/package.json");
		}
		this._packageLinterConfigHandler = new PackageLinterConfigHandler(UI5Plugin.getInstance().parser, packagePath);
	}

	getJSLinterExceptions(): JSLinterException[] {
		return this._packageLinterConfigHandler.getJSLinterExceptions();
	}
	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters): Severity {
		return this._packageLinterConfigHandler.getSeverity(linter);
	}
	checkIfMemberIsException(className: string, memberName: string): boolean {
		return this._packageLinterConfigHandler.checkIfMemberIsException(className, memberName);
	}
	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters): boolean {
		return this._packageLinterConfigHandler.getLinterUsage(linter);
	}
	getIfLintingShouldBeSkipped(document: TextDocument): boolean {
		return this._packageLinterConfigHandler.getIfLintingShouldBeSkipped(document);
	}

}