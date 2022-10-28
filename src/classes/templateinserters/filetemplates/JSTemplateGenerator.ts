import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { TemplateGenerator } from "./abstraction/TemplateGenerator";

export class JSTemplateGenerator extends TemplateGenerator {
	public generateTemplate(uri: vscode.Uri): string | undefined {
		const isController = uri.fsPath.endsWith(".controller.js");
		const classNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(uri.fsPath);
		if (!classNameDotNotation) {
			return;
		}

		const sManagedObjectModuleName =
			vscode.workspace.getConfiguration("ui5.plugin").get("insertManagedObjectModule") as string ??
			"sap/ui/base/ManagedObject";
		const sControllerModuleName =
			vscode.workspace.getConfiguration("ui5.plugin").get("insertControllerModule") as string ??
			"sap/ui/core/mvc/Controller";

		const standardUIDefineClassForExtension = isController
			? sControllerModuleName
			: sManagedObjectModuleName;
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];

		return `sap.ui.define([\r\n\t"${standardUIDefineClassForExtension}"\r\n], function(\r\n\t${controlName}\r\n) {\r\n\t"use strict";\r\n\r\n\treturn ${controlName}.extend("${classNameDotNotation}", {\r\n\t});\r\n});`;
	}
}
