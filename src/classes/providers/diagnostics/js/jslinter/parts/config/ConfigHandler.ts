import * as vscode from "vscode";
export class ConfigHandler {
	static getJSLinterExceptions(): Array<{className: string; memberName: string}> {
		return vscode.workspace.getConfiguration("ui5.plugin").get("JSLinterExceptions") || [{
			className: "sap.ui.model.Binding",
			memberName: "filter"
		}, {
			className: "sap.ui.model.Model",
			memberName: "getResourceBundle"
		}, {
			className: "sap.ui.model.Model",
			memberName: "setProperty"
		}, {
			className: "sap.ui.core.Element",
			memberName: "*"
		}, {
			className: "sap.ui.base.ManagedObject",
			memberName: "*"
		}, {
			className: "sap.ui.core.Control",
			memberName: "*"
		}, {
			className: "sap.ui.xmlfragment",
			memberName: "*"
		}, {
			className: "*",
			memberName: "byId"
		}, {
			className: "*",
			memberName: "prototype"
		}, {
			className: "*",
			memberName: "call"
		}, {
			className: "*",
			memberName: "apply"
		}, {
			className: "*",
			memberName: "bind"
		}, {
			className: "map",
			memberName: "*"
		}];
	}
}