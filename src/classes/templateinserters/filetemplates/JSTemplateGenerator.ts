import { UI5JSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { IParserBearer } from "../../ui5parser/ParserBearer";
import { TemplateGenerator } from "./abstraction/TemplateGenerator";

export class JSTemplateGenerator extends TemplateGenerator implements IParserBearer<UI5JSParser> {
	_parser: UI5JSParser;
	constructor(parser: UI5JSParser) {
		super();
		this._parser = parser;
	}
	public generateTemplate(uri: vscode.Uri): string | undefined {
		const isController = uri.fsPath.endsWith(".controller.js");
		const classNameDotNotation = this._parser.fileReader.getClassNameFromPath(uri.fsPath);
		if (!classNameDotNotation) {
			return;
		}

		const sManagedObjectModuleName =
			(vscode.workspace.getConfiguration("ui5.plugin").get("insertManagedObjectModule") as string) ??
			"sap/ui/base/ManagedObject";
		const sControllerModuleName =
			(vscode.workspace.getConfiguration("ui5.plugin").get("insertControllerModule") as string) ??
			"sap/ui/core/mvc/Controller";

		const standardUIDefineClassForExtension = isController ? sControllerModuleName : sManagedObjectModuleName;
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];

		return `sap.ui.define([\r\n\t"${standardUIDefineClassForExtension}"\r\n], function(\r\n\t${controlName}\r\n) {\r\n\t"use strict";\r\n\r\n\treturn ${controlName}.extend("${classNameDotNotation}", {\r\n\t});\r\n});`;
	}
}
