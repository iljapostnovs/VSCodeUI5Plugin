import * as vscode from "vscode";
import { UI5Plugin } from "../../../UI5Plugin";
import { TemplateGenerator } from "./abstraction/TemplateGenerator";

export class TSTemplateGenerator extends TemplateGenerator {
	public generateTemplate(uri: vscode.Uri): string | undefined {
		const isController = uri.fsPath.endsWith(".controller.ts");
		const classNameDotNotation = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(uri.fsPath);
		if (!classNameDotNotation) {
			return;
		}

		const standardUIDefineClassForExtension = isController ? "sap/ui/core/mvc/Controller" : "sap/ui/base/ManagedObject";
		const UIDefineClassNameParts = standardUIDefineClassForExtension.split("/");
		const controlName = UIDefineClassNameParts[UIDefineClassNameParts.length - 1];
		const namespaceParts = classNameDotNotation?.split(".") ?? "";
		namespaceParts.pop();
		const namespace = namespaceParts.join(".");
		const className = classNameDotNotation.split(".").pop() ?? "";

		return `import ${controlName} from "${standardUIDefineClassForExtension}";\n\n/**\n * @namespace ${namespace}\n */\nexport default class ${className} extends ${controlName} {}`
	}
}