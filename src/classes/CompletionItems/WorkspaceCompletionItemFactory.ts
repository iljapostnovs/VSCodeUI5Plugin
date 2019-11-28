import * as vscode from "vscode"
import * as fs from "fs";
import { ExportToI18NCommand } from "../VSCommands/ExportToI18NCommand";
import { FileReader } from "../Util/FileReader";
let workspace = vscode.workspace;
interface WorkspaceJSFileConstructor {
	fsPath: string,
	UIDefineString: string
}
class UIDefineJSFile {
	public fsPath:string;
	public UIDefineString: string;

	constructor({ fsPath, UIDefineString }: WorkspaceJSFileConstructor) {
		this.fsPath = fsPath;
		this.UIDefineString = UIDefineString;
	}
}
export class WorkspaceCompletionItemFactory {
	static subscribeToFileOpening(handler: Function) {
		vscode.workspace.onDidOpenTextDocument(event => {
			handler(event);
		});
	}

	static async synchronise(completionItems: vscode.CompletionItem[], event: vscode.TextDocument) {
		if (event.languageId === "javascript") {
			const fileFsPath = event.uri.fsPath;
			const defineString = await WorkspaceCompletionItemFactory.getDefineStringFromFileFSPath(fileFsPath);
			if (defineString) {
				let completionItemDoesntExist = !completionItems.find(completionItem => completionItem.label.substring(1, completionItem.label.length - 1) === defineString);

				if (completionItemDoesntExist) {
					let newCompletionItem = WorkspaceCompletionItemFactory.generateCompletionItem(new UIDefineJSFile({
						fsPath: fileFsPath,
						UIDefineString: defineString
					}))

					completionItems.push(newCompletionItem);
				}
			}
		}
	}

	private static async getDefineStringFromFileFSPath(FSPath: string) {
		let defineString = "";

		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let wsFolders = workspace.workspaceFolders || [];
			let currentlyOpenedFileFSPath = editor.document.fileName;
			let currentWSFolder = wsFolders.find(wsFolder => currentlyOpenedFileFSPath.indexOf(wsFolder.uri.fsPath) > -1);

			if (currentWSFolder) {
				let manifests:any = await ExportToI18NCommand.findManifestsInWorkspaceFolder(currentWSFolder);
				for (const manifest of manifests) {
					let UI5Manifest:any = JSON.parse(fs.readFileSync(manifest.fsPath, "ascii"));
					let manifestFsPath:string = manifest.fsPath.replace("\\manifest.json", "");
					let UI5ComponentName:string = UI5Manifest["sap.app"].id;

					if (FSPath.indexOf(manifestFsPath) > -1) {
						defineString = FSPath.replace(".js", "").replace(manifest.fsPath.replace("\\manifest.json", ""), UI5ComponentName).replace(/\./g, "/").replace(/\\/g, "/");
					}
				}
			}
		}
		return defineString;
	}

	async getCompletionItems() {
		let completionItems: vscode.CompletionItem[] = [];

		let JSFilesOfAllWorkspaces = await this.getAllJSFilesOfAllWorkspaces();

		JSFilesOfAllWorkspaces.forEach((JSFile: UIDefineJSFile) => {
			completionItems.push(WorkspaceCompletionItemFactory.generateCompletionItem(JSFile));
		});

		return completionItems;
	}

	private async getAllJSFilesOfAllWorkspaces() {
		let workspaceJSFiles:UIDefineJSFile[] = [];
		let wsFolders = workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			let manifests:any = FileReader.getManifestsInWorkspaceFolder(wsFolder);

			for (const manifest of manifests) {
				let UI5Manifest:any = JSON.parse(fs.readFileSync(manifest.fsPath, "ascii"));
				let manifestFsPath:string = manifest.fsPath.replace("\\manifest.json", "");
				let UI5ComponentName:string = UI5Manifest["sap.app"].id;
				let projectJSFiles:any = await this.findJSFilesForComponentName(UI5ComponentName);

				projectJSFiles.forEach((projectJSFile:any) => {
					if (projectJSFile.fsPath.indexOf(manifestFsPath) > -1) {
						let JSFileUIDefineString = projectJSFile.fsPath.replace(".js", "").replace(manifest.fsPath.replace("\\manifest.json", ""), UI5ComponentName).replace(/\./g, "/").replace(/\\/g, "/");
						workspaceJSFiles.push(
							new UIDefineJSFile({
								fsPath: projectJSFile.fsPath,
								UIDefineString: JSFileUIDefineString
							})
						);
					}
				});
			}
		}

		return workspaceJSFiles;
	}

	private findJSFilesForComponentName(componentName: string) {
		return new Promise((resolve) => {
			workspace.findFiles("**/*.js")
			.then(resolve);
		});
	}

	private static generateCompletionItem(workspaceJSFile: UIDefineJSFile) {
		let insertionText = "\"" + workspaceJSFile.UIDefineString + "\"";
		let completionItem:vscode.CompletionItem = new vscode.CompletionItem(insertionText);
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = insertionText;
		completionItem.detail = insertionText;
		completionItem.documentation = insertionText;

		return completionItem;
	}
}