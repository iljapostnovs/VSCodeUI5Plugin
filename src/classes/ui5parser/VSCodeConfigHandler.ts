import { IParserConfigHandler } from "ui5plugin-parser";
import * as vscode from "vscode";

export class VSCodeConfigHandler implements IParserConfigHandler {
	getUI5Version(): string {
		return vscode.workspace.getConfiguration("ui5.plugin").get("ui5version") || "1.60.11";
	}
	getExcludeFolderPatterns(): string[] {
		return vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [
			"**/resources/**",
			"**/dist/**/**",
			"**/node_modules/**"
		];
	}
	getDataSource(): string {
		return vscode.workspace.getConfiguration("ui5.plugin").get("dataSource") || "https://ui5.sap.com/";
	}
	getRejectUnauthorized(): boolean {
		return vscode.workspace.getConfiguration("ui5.plugin").get("rejectUnauthorized") || false;
	}
	getLibsToLoad(): string[] {
		return vscode.workspace.getConfiguration("ui5.plugin").get("libsToLoad") || [
			"sap.m",
			"sap.ui.comp",
			"sap.f",
			"sap.ui.core",
			"sap.ui.commons",
			"sap.ui.export",
			"sap.ui.layout",
			"sap.ui.support",
			"sap.ui.table",
			"sap.ui.unified",
			"sap.ushell",
			"sap.tnt",
			"sap.suite.ui.microchart"
		];
	}

}