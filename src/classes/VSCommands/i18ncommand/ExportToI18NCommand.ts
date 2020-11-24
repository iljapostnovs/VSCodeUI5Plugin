import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileReader } from "../../Util/FileReader";
import { ResourceModelData } from "../../UI5Classes/ResourceModelData";
import { TextTransformationFactory, CaseType } from "./TextTransformationFactory";
const workspace = vscode.workspace;

export class ExportToI18NCommand {
	public static async export() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const stringRange = ExportToI18NCommand.getStringRange() || new vscode.Range(editor.selection.start, editor.selection.start);
			let stringForReplacing = editor.document.getText(stringRange);
			stringForReplacing = stringForReplacing.substring(1, stringForReplacing.length - 1);
			const I18nID = await ExportToI18NCommand.askUserForI18nID(stringForReplacing);
			if (I18nID) {
				const textForInsertionIntoI18N = await ExportToI18NCommand.generateStringForI18NInsert(stringForReplacing, I18nID);
				const textForInsertionIntoCurrentFile = ExportToI18NCommand.getStringForSavingIntoi18n(I18nID);

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
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const iDeltaStart = ExportToI18NCommand.getDetlaForFirstOccuraneOf("\"", -1);
			const iDeltaEnd = ExportToI18NCommand.getDetlaForFirstOccuraneOf("\"", 1);
			const range = new vscode.Range(editor.selection.start.translate(0, iDeltaStart), editor.selection.start.translate(0, iDeltaEnd));
			return range;
		}
	}

	private static getDetlaForFirstOccuraneOf(sChar: string, iDelta: number) {
		const editor = vscode.window.activeTextEditor;
		let deltaToReturn = iDelta;
		if (editor) {
			const startingPosition = editor.selection.start;
			let selectedText = "";

			while (selectedText[iDelta > 0 ? selectedText.length - 1 : 0] !== sChar) {
				try {
					const range = new vscode.Range(
						startingPosition.translate(0, deltaToReturn < 0 ? deltaToReturn : 0),
						startingPosition.translate(0, deltaToReturn > 0 ? deltaToReturn : 0)
					);
					selectedText = editor.document.getText(range);
					if (selectedText[iDelta > 0 ? selectedText.length - 1 : 0] !== sChar) {
						deltaToReturn += iDelta;
					}
				} catch (error) {
					throw new Error("No string for export to i18n found");
				}

				if (Math.abs(deltaToReturn) > editor.document.getText().length) {
					throw new Error("No string for export to i18n found");
				}
			}

		}

		return deltaToReturn;
	}

	private static async askUserForI18nID(text: string) {
		const startingProposedValue = ExportToI18NCommand.generateProposedI18nID(text);
		let i18nID = startingProposedValue;

		const shouldUserConfirmI18nId = vscode.workspace.getConfiguration("ui5.plugin").get("askUserToConfirmI18nId");
		if (shouldUserConfirmI18nId) {
			i18nID = await vscode.window.showInputBox({
				value: startingProposedValue,
				placeHolder: "Enter i18n ID",
				valueSelection: [startingProposedValue.length, startingProposedValue.length]
			}) || "";
		}

		return i18nID;
	}

	private static generateProposedI18nID(text: string) {
		text = text.trim();
		let proposedi18NValue = "";

		const editor = vscode.window.activeTextEditor;
		const openedFileType = ExportToI18NCommand.getCurrentlyOpenedFileType();

		if (editor) {
			const textTransformationStrategyType = vscode.workspace.getConfiguration("ui5.plugin").get("textTransformationStrategy");
			const textTransformationStrategy = TextTransformationFactory.createTextTransformationStrategy();

			if (textTransformationStrategyType === CaseType.PascalCase) {
				const currentlyOpenedFileFSPath = editor.document.fileName;
				const addition = (() => {
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
				const nameParts = currentlyOpenedFileFSName.split(path.sep);
				const fileName = nameParts[nameParts.length -1];

				const transofrmatedText = textTransformationStrategy.transform(text);
				proposedi18NValue = `${fileName}${addition}.${transofrmatedText}`;

			} else if (textTransformationStrategyType === CaseType.SnakeUpperCase) {

				proposedi18NValue = textTransformationStrategy.transform(text);
			}

		}

		return proposedi18NValue;
	}

	private static async generateStringForI18NInsert(selectedText: string, I18nID: string) {
		const shouldUserConfirmI18nId = vscode.workspace.getConfiguration("ui5.plugin").get("askUserToConfirmI18nId");
		let item;
		if (shouldUserConfirmI18nId) {
			const i18nIDs = [{
				label: "YMSG",
				description: "Message text (long)"
			}].concat(require("./i18nIDs.json"));


			const resourceGroups: vscode.QuickPickItem[] = i18nIDs;
			item = await vscode.window.showQuickPick(resourceGroups, {
				matchOnDescription: true,
			});
		}

		const shouldAddTextLength = vscode.workspace.getConfiguration("ui5.plugin").get("addI18nTextLengthLimitation");
		const textLength = shouldAddTextLength ? `,${selectedText.length}` : "";

		const textToInsert = `\n#${item?.label || "YMSG"}${textLength}: ${I18nID}\n${I18nID} = ${selectedText}`;
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
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const currentlyOpenedFileFSPath = editor.document.fileName;
			const openedFileIsController = currentlyOpenedFileFSPath.endsWith(".controller.js");
			const openedFileIsJSFile = currentlyOpenedFileFSPath.endsWith(".js");
			const openedFileIsXMLFile = currentlyOpenedFileFSPath.endsWith(".xml");

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
		const manifest = FileReader.getCurrentWorkspaceFoldersManifest();
		const manifestFsPath = manifest?.fsPath;
		const i18nRelativePath = manifest?.content["sap.app"].i18n;
		if (manifestFsPath && i18nRelativePath) {
			const i18nFSPath = `${manifestFsPath}${path.sep}${i18nRelativePath.replace(/\//g, path.sep)}`;

			fs.appendFileSync(i18nFSPath, stringToInsert, "utf8");
			ResourceModelData.readTexts();
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