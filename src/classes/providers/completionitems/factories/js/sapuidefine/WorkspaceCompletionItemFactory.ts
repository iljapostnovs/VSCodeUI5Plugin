import * as path from "path";
import { ParserPool } from "ui5plugin-parser";
import * as vscode from "vscode";
import ParserBearer from "../../../../../ui5parser/ParserBearer";
import { CustomCompletionItem } from "../../../CustomCompletionItem";
import { ICompletionItemFactory } from "../../abstraction/ICompletionItemFactory";
const escapedFileSeparator = "\\" + path.sep;

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
export class WorkspaceCompletionItemFactory extends ParserBearer implements ICompletionItemFactory {
	async synchronizeCreate(completionItems: CustomCompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath;
		const defineString = (this._parser.fileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/");
		if (defineString) {
			const newCompletionItem = this._generateCompletionItem(
				new UIDefineJSFile({
					fsPath: fileFsPath,
					UIDefineString: defineString
				})
			);

			completionItems.push(newCompletionItem);
		}
	}

	async synchronizeDelete(completionItems: CustomCompletionItem[], textDocument: vscode.Uri) {
		const fileFsPath = textDocument.fsPath;
		const defineString = (this._parser.fileReader.getClassNameFromPath(fileFsPath) || "").replace(/\./g, "/");
		if (defineString) {
			const deletedCompletionItem = completionItems.find(
				completionItem =>
					(completionItem.label as string).substring(1, (completionItem.label as string).length - 1) ===
					defineString
			);
			if (deletedCompletionItem) {
				completionItems.splice(completionItems.indexOf(deletedCompletionItem), 1);
			}
		}
	}

	async createCompletionItems() {
		const completionItems: CustomCompletionItem[] = [];

		const JSFilesOfAllWorkspaces = this._getAllJSFilesOfAllWorkspaces();

		JSFilesOfAllWorkspaces.forEach(JSFile => {
			completionItems.push(this._generateCompletionItem(JSFile));
		});

		return completionItems;
	}

	private _getAllJSFilesOfAllWorkspaces(): UIDefineJSFile[] {
		const separator = path.sep;

		const customClasses = ParserPool.getAllCustomUIClasses();

		return customClasses
			.map(customClass => {
				const manifest = ParserPool.getManifestForClass(customClass.className);
				if (manifest) {
					const manifestPath = path.normalize(manifest.fsPath);
					const UI5Manifest: any = manifest.content;
					const UI5ComponentName: string = UI5Manifest["sap.app"]?.id || "";

					const JSFileUIDefineString = customClass.fsPath
						.replace(/\.(ts|js)$/, "")
						.replace(manifestPath.replace(`${separator}manifest.json`, ""), UI5ComponentName)
						.replace(/\./g, "/")
						.replace(new RegExp(`${escapedFileSeparator}`, "g"), "/");

					return new UIDefineJSFile({
						fsPath: customClass.fsPath,
						UIDefineString: JSFileUIDefineString
					});
				}
			})
			.filter(UIDefineJSFile => !!UIDefineJSFile) as UIDefineJSFile[];
	}

	private _generateCompletionItem(workspaceJSFile: UIDefineJSFile) {
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
