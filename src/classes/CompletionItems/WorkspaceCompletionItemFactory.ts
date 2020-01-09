import * as vscode from "vscode"
import * as fs from "fs"
import { ExportToI18NCommand } from "../VSCommands/ExportToI18NCommand"
import { FileReader } from "../Util/FileReader"

const workspace = vscode.workspace

interface WorkspaceJSFileConstructor {
	fsPath: string,
	UIDefineString: string
}
class UIDefineJSFile {
	public fsPath:string
	public UIDefineString: string

	constructor({ fsPath, UIDefineString }: WorkspaceJSFileConstructor) {
		this.fsPath = fsPath
		this.UIDefineString = UIDefineString
	}
}
export class WorkspaceCompletionItemFactory {
	static async synchroniseCreate(completionItems: vscode.CompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath
		const defineString = (FileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/")
		if (defineString) {
			const newCompletionItem = WorkspaceCompletionItemFactory.generateCompletionItem(
				new UIDefineJSFile({
					fsPath: fileFsPath,
					UIDefineString: defineString
				})
			)

			completionItems.push(newCompletionItem)
		}
	}

	static async synchroniseDelete(completionItems: vscode.CompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath
		const defineString = (FileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/")
		if (defineString) {
			const deletedCompletionItem = completionItems.find(completionItem => completionItem.label.substring(1, completionItem.label.length - 1) === defineString)
			if (deletedCompletionItem) {
				completionItems.splice(completionItems.indexOf(deletedCompletionItem), 1)
			}
		}
	}

	async getCompletionItems() {
		const completionItems: vscode.CompletionItem[] = []

		const JSFilesOfAllWorkspaces = await this.getAllJSFilesOfAllWorkspaces()

		JSFilesOfAllWorkspaces.forEach((JSFile: UIDefineJSFile) => {
			completionItems.push(WorkspaceCompletionItemFactory.generateCompletionItem(JSFile))
		})

		return completionItems
	}

	private async getAllJSFilesOfAllWorkspaces() {
		const workspaceJSFiles:UIDefineJSFile[] = []
		const wsFolders = workspace.workspaceFolders || []
		for (const wsFolder of wsFolders) {
			const manifests:any = FileReader.getManifestsInWorkspaceFolder(wsFolder)

			for (const manifest of manifests) {
				const UI5Manifest:any = JSON.parse(fs.readFileSync(manifest.fsPath, "ascii"))
				const manifestFsPath:string = manifest.fsPath.replace("\\manifest.json", "")
				const UI5ComponentName:string = UI5Manifest["sap.app"].id
				const projectJSFiles:any = await this.findJSFilesForComponentName(UI5ComponentName)

				projectJSFiles.forEach((projectJSFile:any) => {
					if (projectJSFile.fsPath.indexOf(manifestFsPath) > -1) {
						const JSFileUIDefineString = projectJSFile.fsPath.replace(".js", "").replace(manifest.fsPath.replace("\\manifest.json", ""), UI5ComponentName).replace(/\./g, "/").replace(/\\/g, "/")
						workspaceJSFiles.push(
							new UIDefineJSFile({
								fsPath: projectJSFile.fsPath,
								UIDefineString: JSFileUIDefineString
							})
						)
					}
				})
			}
		}

		return workspaceJSFiles
	}

	private findJSFilesForComponentName(componentName: string) {
		return new Promise((resolve) => {
			workspace.findFiles("**/*.js")
			.then(resolve)
		})
	}

	private static generateCompletionItem(workspaceJSFile: UIDefineJSFile) {
		const insertionText = "\"" + workspaceJSFile.UIDefineString + "\""
		const completionItem:vscode.CompletionItem = new vscode.CompletionItem(insertionText)
		completionItem.kind = vscode.CompletionItemKind.Class
		completionItem.insertText = insertionText
		completionItem.detail = insertionText
		completionItem.documentation = insertionText

		return completionItem
	}
}