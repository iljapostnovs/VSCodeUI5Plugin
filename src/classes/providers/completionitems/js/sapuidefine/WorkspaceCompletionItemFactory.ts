import * as vscode from "vscode";
import * as fs from "fs";
import { FileReader } from "../../../../utils/FileReader";
import * as path from "path";
import { CustomCompletionItem } from "../../CustomCompletionItem";
import glob = require("glob");
const escapedFileSeparator = "\\" + path.sep;
const workspace = vscode.workspace;

interface IWorkspaceJSFileConstructor {
	fsPath: string;
	UIDefineString: string;
}
class UIDefineJSFile {
	public fsPath: string;
	public UIDefineString: string;

	constructor({ fsPath, UIDefineString }: IWorkspaceJSFileConstructor) {
		this.fsPath = fsPath;
		this.UIDefineString = UIDefineString;
	}
}
export class WorkspaceCompletionItemFactory {
	static async synchronizeCreate(completionItems: CustomCompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath;
		const defineString = (FileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/");
		if (defineString) {
			const newCompletionItem = WorkspaceCompletionItemFactory._generateCompletionItem(
				new UIDefineJSFile({
					fsPath: fileFsPath,
					UIDefineString: defineString
				})
			);

			completionItems.push(newCompletionItem);
		}
	}

	static async synchronizeDelete(completionItems: CustomCompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath;
		const defineString = (FileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/");
		if (defineString) {
			const deletedCompletionItem = completionItems.find(completionItem => completionItem.label.substring(1, completionItem.label.length - 1) === defineString);
			if (deletedCompletionItem) {
				completionItems.splice(completionItems.indexOf(deletedCompletionItem), 1);
			}
		}
	}

	async getCompletionItems() {
		const completionItems: CustomCompletionItem[] = [];

		const JSFilesOfAllWorkspaces = await this._getAllJSFilesOfAllWorkspaces();

		JSFilesOfAllWorkspaces.forEach((JSFile: UIDefineJSFile) => {
			completionItems.push(WorkspaceCompletionItemFactory._generateCompletionItem(JSFile));
		});

		return completionItems;
	}

	private async _getAllJSFilesOfAllWorkspaces() {
		const workspaceJSFiles: UIDefineJSFile[] = [];
		const wsFolders = workspace.workspaceFolders || [];
		const separator = path.sep;
		for (const wsFolder of wsFolders) {
			const manifests: any = FileReader.getManifestPathsInWorkspaceFolder(wsFolder);

			for (const manifest of manifests) {
				const manifestPath = path.normalize(manifest.fsPath);
				const UI5Manifest: any = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
				const manifestFsPath: string = manifestPath.replace(`${separator}manifest.json`, "");
				const UI5ComponentName: string = UI5Manifest["sap.app"]?.id || "";
				const projectJSFiles = this._findJSFilesInWorkspaceFolder(wsFolder);

				projectJSFiles.forEach((projectJSFilePath) => {
					if (projectJSFilePath.indexOf(manifestFsPath) > -1) {
						const JSFileUIDefineString =
							projectJSFilePath
								.replace(".js", "")
								.replace(manifestPath.replace(`${separator}manifest.json`, ""), UI5ComponentName)
								.replace(/\./g, "/")
								.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");
						workspaceJSFiles.push(
							new UIDefineJSFile({
								fsPath: projectJSFilePath,
								UIDefineString: JSFileUIDefineString
							})
						);
					}
				});
			}
		}

		return workspaceJSFiles;
	}

	private _findJSFilesInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		const wsFolderFSPath = wsFolder.uri.fsPath.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");

		const exclusions: string[] = vscode.workspace.getConfiguration("ui5.plugin").get("excludeFolderPattern") || [];
		const exclusionPaths = exclusions.map(excludeString => {
			return `${wsFolderFSPath}/${excludeString}`
		});
		return glob.sync(`${wsFolderFSPath}/**/*.js`, {
			ignore: exclusionPaths
		}).map(jsFilePath => path.normalize(jsFilePath));
	}

	private static _generateCompletionItem(workspaceJSFile: UIDefineJSFile) {
		const insertionText = `"${workspaceJSFile.UIDefineString}"`;
		const completionItem: CustomCompletionItem = new CustomCompletionItem(insertionText);
		completionItem.kind = vscode.CompletionItemKind.Class;
		completionItem.insertText = insertionText;
		completionItem.detail = insertionText;
		completionItem.documentation = insertionText;
		if (vscode.workspace.getConfiguration("ui5.plugin").get("moveDefineToFunctionParametersOnAutocomplete")) {
			completionItem.command = { command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define" };
		}

		return completionItem;
	}
}