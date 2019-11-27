import * as vscode from "vscode";
import * as fs from "fs";
let workspace = vscode.workspace;

export class ExportToI18NCommand {
	public static async export() {
		let editor = vscode.window.activeTextEditor;

		if (editor) {
			let stringRange = ExportToI18NCommand.getStringRange() || new vscode.Range(editor.selection.start, editor.selection.start);
			let stringForReplacing = editor.document.getText(stringRange);
			stringForReplacing = stringForReplacing.substring(1, stringForReplacing.length - 1);
			let I18nID = await ExportToI18NCommand.askUserFori18nID();
			if (I18nID) {
				let textForInsertionIntoI18N = ExportToI18NCommand.generateStringForI18NInsert(stringForReplacing, I18nID);
				let textForInsertionIntoCurrentFile = ExportToI18NCommand.getStringForSavingIntoi18n(I18nID);

				await ExportToI18NCommand.insertIntoi18NFile(textForInsertionIntoI18N);

				editor.edit(editBuilder => {
					if (editor) {
						editBuilder.replace(stringRange, textForInsertionIntoCurrentFile);

						editor.selection = new vscode.Selection(
							stringRange.start,
							stringRange.start
						);
					}
				});
			}
		}
	}

	private static getStringRange() {
		let editor = vscode.window.activeTextEditor;

		if (editor) {
			let iDeltaStart = ExportToI18NCommand.getDetlaForFirstOccuraneOf("\"", -1);
			let iDeltaEnd = ExportToI18NCommand.getDetlaForFirstOccuraneOf("\"", 1);
			let range = new vscode.Range(editor.selection.start.translate(0, iDeltaStart), editor.selection.start.translate(0, iDeltaEnd));
			// let selectedText = editor.document.getText(range);
			return range;
		}
	}

	private static getDetlaForFirstOccuraneOf(sChar: string, iDelta: number) {
		let editor = vscode.window.activeTextEditor;
		let deltaToReturn = 1;
		if (editor) {
			let startingPosition = editor.selection.start;
			let selectedText = "";

			while (selectedText[iDelta > 0 ? selectedText.length - 1 : 0] !== sChar) {
				let range = new vscode.Range(startingPosition.translate(0, deltaToReturn < 0 ? deltaToReturn : 0), startingPosition.translate(0, deltaToReturn > 0 ? deltaToReturn : 0));
				selectedText = editor.document.getText(range);
				if (selectedText[iDelta > 0 ? selectedText.length - 1 : 0] !== sChar) {
					deltaToReturn += iDelta;
				}
			}

		}

		return deltaToReturn;
	}

	private static async askUserFori18nID() {
		const startingProposedValue = ExportToI18NCommand.generateProposedi18nID();
		const i18nID = await vscode.window.showInputBox({
			value: startingProposedValue,
			placeHolder: "Enter i18n ID",
			valueSelection: [startingProposedValue.length, startingProposedValue.length]
		}) || "";

		return i18nID;
	}

	private static generateProposedi18nID() {
		let proposedi18NValue = "";

		let editor = vscode.window.activeTextEditor;
		const openedFileType = ExportToI18NCommand.getCurrentlyOpenedFileType();
		if (editor) {
			let currentlyOpenedFileFSPath = editor.document.fileName;
			let addition = (() => {
				let returnString = "";
				if (openedFileType === ExportToI18NCommand.fileType.controller) {
					returnString = "Controller";
				} else if (openedFileType === ExportToI18NCommand.fileType.xml) {
					returnString = "View";
				}

				return returnString;
			})();

			let currentlyOpenedFileFSName = currentlyOpenedFileFSPath.replace(".controller.js", "");
			currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(".js", "");
			currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(".view.xml", "");
			currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(".xml", "");
			let nameParts = currentlyOpenedFileFSName.split("\\");
			let fileName = nameParts[nameParts.length -1];

			proposedi18NValue = fileName + addition + ".";
		}

		return proposedi18NValue;
	}

	private static generateStringForI18NInsert(selectedText: string, I18nID: string) {
		//TODO: generate also different types than YMSG
		let textToInsert = `\r\n#YMSG: ${I18nID}\n${I18nID} = ${selectedText}`;
		return textToInsert;
	}

	private static getStringForSavingIntoi18n(I18nID: string) {
		const openedFileType = ExportToI18NCommand.getCurrentlyOpenedFileType();
		const typeMapping: any = {
			xml: `"{i18n>${I18nID}}"`,
			controller: `this.getBundle().getText("${I18nID}")`,
			js: `this.getModel("i18n").getResourceBundle().getText("${I18nID}")`
		};

		return typeMapping[openedFileType];
	}

	private static getCurrentlyOpenedFileType() {
		let type = "";
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let currentlyOpenedFileFSPath = editor.document.fileName;
			let openedFileIsController = currentlyOpenedFileFSPath.endsWith(".controller.js");
			let openedFileIsJSFile = currentlyOpenedFileFSPath.endsWith(".js");
			let openedFileIsXMLFile = currentlyOpenedFileFSPath.endsWith(".xml");

			if (openedFileIsController) {
				type = ExportToI18NCommand.fileType.controller;
			} else if (openedFileIsJSFile) {
				type = ExportToI18NCommand.fileType.js;
			} else if (openedFileIsXMLFile) {
				type = ExportToI18NCommand.fileType.xml;
			}
		}

		return type;
	}

	private static async insertIntoi18NFile(stringToInsert: string) {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let wsFolders = workspace.workspaceFolders || [];
			let currentlyOpenedFileFSPath = editor.document.fileName;
			let currentWSFolder = wsFolders.find(wsFolder => currentlyOpenedFileFSPath.indexOf(wsFolder.uri.fsPath) > -1);

			if (currentWSFolder) {
				let manifests:any = await this.findManifestsInWorkspaceFolder(currentWSFolder);
				for (const manifest of manifests) {
					let UI5Manifest:any = JSON.parse(fs.readFileSync(manifest.fsPath, "ascii"));
					let manifestFsPath:string = manifest.fsPath.replace("\\manifest.json", "");
					let i18nRelativePath:string = UI5Manifest["sap.app"].i18n;
					let i18nFSPath = manifestFsPath + "\\" + i18nRelativePath.replace(/\//g, "\\");
					fs.appendFileSync(i18nFSPath, stringToInsert, "utf8");
				}
			}
		}
	}

	public static findManifestsInWorkspaceFolder(wsFolder: vscode.WorkspaceFolder) {
		return new Promise((resolve) => {
			workspace.findFiles(new vscode.RelativePattern(wsFolder || "", "**/manifest.json"))
			.then(resolve);
		});
	}
}

export namespace ExportToI18NCommand {
    export enum fileType {
		xml = "xml",
		controller = "controller",
		js = "js"
	}
}