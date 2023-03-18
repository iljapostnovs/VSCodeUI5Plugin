import { UI5TSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { IParserBearer } from "../../ui5parser/ParserBearer";
import { TemplateGenerator } from "./abstraction/TemplateGenerator";

export class TSTemplateGenerator extends TemplateGenerator implements IParserBearer<UI5TSParser> {
	_parser: UI5TSParser;
	constructor(parser: UI5TSParser) {
		super();
		this._parser = parser;
	}
	public generateTemplate(uri: vscode.Uri): string | undefined {
		const isController = uri.fsPath.endsWith(".controller.ts");
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
		const namespaceParts = classNameDotNotation?.split(".") ?? "";
		namespaceParts.pop();
		const namespace = namespaceParts.join(".");
		const className = classNameDotNotation.split(".").pop() ?? "";

		return `import ${controlName} from "${standardUIDefineClassForExtension}";\n\n/**\n * @namespace ${namespace}\n */\nexport default class ${className} extends ${controlName} {}`;
	}
}
