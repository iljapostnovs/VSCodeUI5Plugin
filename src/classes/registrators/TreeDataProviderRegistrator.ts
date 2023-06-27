import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { ProjectDataTreeProvider } from "../providers/treedataprovider/projectdata/ProjectDataTreeProvider";
import { UI5ClassTreeDataProvider } from "../providers/treedataprovider/ui5classtree/UI5ClassTreeDataProvider";

export class TreeDataProviderRegistrator {
	static register() {
		const treeProvider = new UI5ClassTreeDataProvider();
		const treeView = vscode.window.createTreeView("ui5Explorer", {
			treeDataProvider: treeProvider,
			showCollapseAll: true
		});

		let disposable = vscode.commands.registerCommand("ui5plugin.refreshClassTree", () => treeProvider.refresh());
		UI5Plugin.getInstance().addDisposable(disposable);
		disposable = vscode.commands.registerCommand("ui5plugin.expandClassTree", () => {
			treeProvider.rootNodes.forEach(rootNode => {
				treeView.reveal(rootNode, {
					select: false,
					focus: false,
					expand: 2
				});
			});
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.window.onDidChangeActiveTextEditor(() => treeProvider.refresh());
		UI5Plugin.getInstance().addDisposable(disposable);

		disposable = vscode.workspace.onDidSaveTextDocument(() => {
			treeProvider.refresh();
		});
		UI5Plugin.getInstance().addDisposable(disposable);

		const projectDataProvider = new ProjectDataTreeProvider();
		vscode.window.createTreeView("ui5projectdata", {
			treeDataProvider: projectDataProvider,
			showCollapseAll: false
		});

		disposable = vscode.commands.registerCommand("ui5plugin.refreshUI5ProjectDataTree", () =>
			projectDataProvider.refresh()
		);
		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
