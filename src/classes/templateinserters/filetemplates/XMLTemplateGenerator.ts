import * as vscode from "vscode";
import { TemplateGenerator } from "./abstraction/TemplateGenerator";

const viewTemplate =
`<mvc:View
	controllerName=""
	xmlns:mvc="sap.ui.core.mvc"
	xmlns="sap.m"
	xmlns:c="sap.ui.core"
	displayBlock="true"
	height="100%"
	busyIndicatorDelay="0"
>
</mvc:View>`;

const fragmentTemplate =
`<c:FragmentDefinition
	xmlns="sap.m"
	xmlns:c="sap.ui.core"
>
</c:FragmentDefinition>`;

export class XMLTemplateGenerator extends TemplateGenerator {
	public generateTemplate(uri: vscode.Uri): string | undefined {
		let template;
		const isView = uri.fsPath.endsWith(".view.xml");
		const isFragment = uri.fsPath.endsWith(".fragment.xml");
		if (isView) {
			template = viewTemplate;
		} else if (isFragment) {
			template = fragmentTemplate;
		}

		return template;
	}
}