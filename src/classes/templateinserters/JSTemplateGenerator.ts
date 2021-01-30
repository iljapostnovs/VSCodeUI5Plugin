import * as vscode from "vscode";
import {FileReader} from "../utils/FileReader";
import {TemplateGenerator} from "./abstraction/TemplateGenerator";

export class JSTemplateGenerator extends TemplateGenerator {
	public generateTemplate(uri: vscode.Uri): string | undefined {
		const isController = uri.fsPath.endsWith(".controller.js");
		const classNameDotNotation = FileReader.getClassNameFromPath(uri.fsPath);

		const standardUIDefineClassForExtension = isController ? "sap/ui/core/mvc/Controller" : "sap/ui/base/ManagedObject";
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];

		const template = `sap.ui.define([\r\n\t"${standardUIDefineClassForExtension}"\r\n], function(\r\n\t${controlName}\r\n) {\r\n\t"use strict";\r\n\r\n\treturn ${controlName}.extend("${classNameDotNotation}", {\r\n\t});\r\n});`;

		return template;
	}
}