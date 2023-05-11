import { appendFile } from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";
import { CaseType, TextTransformationFactory } from "./TextTransformationFactory";
import * as jsClassData from "./i18nIDs.json";

export class ExportToI18NCommand extends ParserBearer {
	public async export() {
		const editor = vscode.window.activeTextEditor;

		let replaceStringRange = this._getReplaceStringRange();
		let shouldCropQuotes = false;
		const fullStringRange = this._getFullStringRange();
		const stringForReplacing = replaceStringRange && editor?.document.getText(replaceStringRange);
		const I18nID = stringForReplacing && (await this._askUserForI18nID(stringForReplacing));
		let textForInsertionIntoCurrentFile = I18nID && this._getStringForSavingIntoCurrentFile(I18nID);
		const isInStringTemplate = this._isCurrentPositionInStringTemplate();
		if (!I18nID || !textForInsertionIntoCurrentFile || !editor || !replaceStringRange || !fullStringRange) {
			return;
		}

		const replacingIsPartial = !replaceStringRange.isEqual(fullStringRange);
		const thereIsNoSelection = editor.selection.start.isEqual(editor.selection.end);
		if (isInStringTemplate && !replacingIsPartial && thereIsNoSelection) {
			throw new Error("Please select range which you want to export");
		}

		if (replacingIsPartial) {
			const openedFileType = this._getCurrentlyOpenedFileType();
			const isJsTs = openedFileType === this.fileType.controller || openedFileType === this.fileType.jsts;
			if (isJsTs && !isInStringTemplate) {
				textForInsertionIntoCurrentFile = this._regenerateTextForInsertion(
					editor,
					fullStringRange,
					replaceStringRange,
					textForInsertionIntoCurrentFile
				);
				shouldCropQuotes = true;
				replaceStringRange = fullStringRange;
			} else if (isInStringTemplate) {
				textForInsertionIntoCurrentFile = `\${${textForInsertionIntoCurrentFile}}`;
			}
		} else {
			const openedFileType = this._getCurrentlyOpenedFileType();
			const isJsTs = openedFileType === this.fileType.controller || openedFileType === this.fileType.jsts;
			if (isJsTs) {
				shouldCropQuotes = true;
			}
		}
		const i18nIdIsDuplicated = this._getIfi18nIdIsDuplicated(I18nID);
		if (!i18nIdIsDuplicated) {
			const textForInsertionIntoI18N = await this._generateStringForI18NInsert(stringForReplacing, I18nID);
			await this._insertIntoI18NFile(textForInsertionIntoI18N);
		}

		await editor.edit(editBuilder => {
			if (!replaceStringRange) {
				return;
			}
			const rangeToReplace = new vscode.Range(
				replaceStringRange.start.translate(0, shouldCropQuotes ? -1 : 0),
				replaceStringRange.end.translate(0, shouldCropQuotes ? 1 : 0)
			);
			editBuilder.replace(rangeToReplace, textForInsertionIntoCurrentFile ?? "");

			editor.selection = new vscode.Selection(rangeToReplace.start, rangeToReplace.end);
		});
	}

	private _regenerateTextForInsertion(
		editor: vscode.TextEditor,
		fullStringRange: vscode.Range,
		replaceStringRange: vscode.Range,
		textForInsertionIntoCurrentFile: string | undefined
	) {
		const document = editor.document;
		const fullString = document.getText(fullStringRange);

		const replaceFrom = document.offsetAt(replaceStringRange.start) - document.offsetAt(fullStringRange.start);
		const replaceTo = document.offsetAt(replaceStringRange.end) - document.offsetAt(fullStringRange.end);
		textForInsertionIntoCurrentFile = `\`${fullString.substring(
			0,
			replaceFrom
		)}\${${textForInsertionIntoCurrentFile}}${fullString.substring(
			fullString.length + replaceTo,
			fullString.length
		)}\``;
		return textForInsertionIntoCurrentFile;
	}

	private _getIfi18nIdIsDuplicated(I18nID: string) {
		const [manifest] = this._parser.fileReader.getAllManifests();
		if (!manifest) {
			return false;
		}
		const componentName = manifest.componentName;
		const resourceModelTexts = this._parser.resourceModelData.resourceModels[componentName];

		return resourceModelTexts.some(text => text.id === I18nID);
	}

	private _getFullStringRange() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const { iDeltaStart, iDeltaEnd } = this._getDeltaStartEnd();
			if (iDeltaStart === undefined || iDeltaEnd === undefined) {
				return;
			}
			const range = new vscode.Range(
				editor.selection.start.translate(0, iDeltaStart + 1),
				editor.selection.start.translate(0, iDeltaEnd - 1)
			);
			return range;
		}
	}

	private _getReplaceStringRange() {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			if (editor.selection.start.isEqual(editor.selection.end)) {
				const { iDeltaStart, iDeltaEnd } = this._getDeltaStartEnd();
				if (iDeltaStart === undefined || iDeltaEnd === undefined) {
					return;
				}
				const range = new vscode.Range(
					editor.selection.start.translate(0, iDeltaStart + 1),
					editor.selection.start.translate(0, iDeltaEnd - 1)
				);
				return range;
			} else {
				const range = new vscode.Range(editor.selection.start, editor.selection.end);
				return range;
			}
		}
	}

	private _getDeltaStartEnd() {
		let iDeltaStart: number | undefined;
		let iDeltaEnd: number | undefined;
		try {
			// eslint-disable-next-line @typescript-eslint/quotes
			iDeltaStart = this._getDeltaForFirstOccuraneOf('"', -1);
			// eslint-disable-next-line @typescript-eslint/quotes
			iDeltaEnd = this._getDeltaForFirstOccuraneOf('"', 1);
		} catch (oError: any) {
			try {
				iDeltaStart = this._getDeltaForFirstOccuraneOf("'", -1);
				iDeltaEnd = this._getDeltaForFirstOccuraneOf("'", 1);
			} catch (oError) {
				iDeltaStart = this._getDeltaForFirstOccuraneOf("`", -1);
				iDeltaEnd = this._getDeltaForFirstOccuraneOf("`", 1);
			}
		}
		return { iDeltaStart, iDeltaEnd };
	}

	private _isCurrentPositionInStringTemplate() {
		try {
			const iDeltaStart = this._getDeltaForFirstOccuraneOf("`", -1);
			const iDeltaEnd = this._getDeltaForFirstOccuraneOf("`", 1);

			return iDeltaStart !== undefined && iDeltaEnd !== undefined;
		} catch (oError) {
			return false;
		}
	}

	private _getDeltaForFirstOccuraneOf(sChar: string, iDelta: number) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		let deltaToReturn =
			editor.document.offsetAt(editor.selection.end) - editor.document.offsetAt(editor.selection.start);
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

		return deltaToReturn;
	}

	private async _askUserForI18nID(text: string) {
		const startingProposedValue = this._generateProposedI18nID(text);
		let i18nID = startingProposedValue;

		const shouldUserConfirmI18nId = vscode.workspace.getConfiguration("ui5.plugin").get("askUserToConfirmI18nId");
		if (shouldUserConfirmI18nId) {
			i18nID =
				(await vscode.window.showInputBox({
					value: startingProposedValue,
					placeHolder: "Enter i18n ID",
					valueSelection: [startingProposedValue.length, startingProposedValue.length]
				})) || "";
		}

		return i18nID;
	}

	private _generateProposedI18nID(text: string) {
		text = text.trim();
		let proposedI18NValue = "";

		const editor = vscode.window.activeTextEditor;
		const openedFileType = this._getCurrentlyOpenedFileType();

		if (editor) {
			const textTransformationStrategyType = vscode.workspace
				.getConfiguration("ui5.plugin")
				.get("textTransformationStrategy");
			const textTransformationStrategy = TextTransformationFactory.createTextTransformationStrategy();

			if (textTransformationStrategyType === CaseType.PascalCase) {
				const currentlyOpenedFileFSPath = editor.document.fileName;
				const addition = (() => {
					let returnString = "";
					if (openedFileType === this.fileType.controller) {
						returnString = "Controller";
					} else if (openedFileType === this.fileType.xml) {
						if (currentlyOpenedFileFSPath.endsWith(".fragment.xml")) {
							returnString = "Fragment";
						} else {
							returnString = "View";
						}
					}

					return returnString;
				})();

				let currentlyOpenedFileFSName = currentlyOpenedFileFSPath.replace(/\.controller\.(js|ts)$/, "");
				currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(/\.(ts|js)$/, "");
				currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(/\.view\.xml$/, "");
				currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(/\.fragment\.xml$/, "");
				currentlyOpenedFileFSName = currentlyOpenedFileFSName.replace(/\.xml$/, "");
				const nameParts = currentlyOpenedFileFSName.split(path.sep);
				const fileName = nameParts[nameParts.length - 1];

				const transformatedText = textTransformationStrategy.transform(text);
				proposedI18NValue = `${fileName}${addition}.${transformatedText}`;
			} else if (textTransformationStrategyType === CaseType.SnakeUpperCase) {
				proposedI18NValue = textTransformationStrategy.transform(text);
			}
		}

		return proposedI18NValue;
	}

	private async _generateStringForI18NInsert(selectedText: string, I18nID: string) {
		const shouldUserConfirmI18nId = vscode.workspace.getConfiguration("ui5.plugin").get("askUserToConfirmI18nId");
		let item;
		if (shouldUserConfirmI18nId) {
			const i18nIDs = [
				{
					label: "YMSG",
					description: "Message text (long)"
				}
			].concat(jsClassData);

			const resourceGroups: vscode.QuickPickItem[] = i18nIDs;
			item = await vscode.window.showQuickPick(resourceGroups, {
				matchOnDescription: true
			});
		}

		const shouldAddTextLength = vscode.workspace.getConfiguration("ui5.plugin").get("addI18nTextLengthLimitation");
		const textLength = shouldAddTextLength ? `,${selectedText.length}` : "";

		const textToInsert = `\n#${item?.label || "YMSG"}${textLength}: ${I18nID}\n${I18nID} = ${selectedText}`;
		return textToInsert;
	}

	private _getStringForSavingIntoCurrentFile(I18nID: string): string | undefined {
		const openedFileType = this._getCurrentlyOpenedFileType();
		const typeMapping: any = {
			xml: `{i18n>${I18nID}}`,
			controller: `this.getBundle().getText("${I18nID}")`,
			jsts: `this.getModel("i18n").getResourceBundle().getText("${I18nID}")`
		};

		return typeMapping[openedFileType];
	}

	private _getCurrentlyOpenedFileType() {
		let type = "";
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const currentlyOpenedFileFSPath = editor.document.fileName;
			const openedFileIsController =
				currentlyOpenedFileFSPath.endsWith(".controller.js") ||
				currentlyOpenedFileFSPath.endsWith(".controller.ts");
			const openedFileIsJSTSFile =
				currentlyOpenedFileFSPath.endsWith(".js") || currentlyOpenedFileFSPath.endsWith(".ts");
			const openedFileIsXMLFile = currentlyOpenedFileFSPath.endsWith(".xml");

			if (openedFileIsController) {
				type = this.fileType.controller;
			} else if (openedFileIsJSTSFile) {
				type = this.fileType.jsts;
			} else if (openedFileIsXMLFile) {
				type = this.fileType.xml;
			}
		}

		return type;
	}

	private async _insertIntoI18NFile(stringToInsert: string) {
		const [manifest] = this._parser.fileReader.getAllManifests();
		const manifestFsPath = manifest?.fsPath;
		let i18nRelativePath = manifest?.content["sap.app"]?.i18n;
		if (typeof i18nRelativePath === "object") {
			i18nRelativePath = i18nRelativePath.bundleUrl;
		}
		if (!i18nRelativePath) {
			throw new Error(
				"Invalid i18n bundle path in manifest.json. Please define path to i18n by setting 'sap.app.i18n' or 'sap.app.i18n.bundleUrl' field in manifest.json"
			);
		}

		if (manifestFsPath && i18nRelativePath) {
			const i18nFSPath = `${manifestFsPath}${path.sep}${i18nRelativePath.replace(/\//g, path.sep)}`;

			await appendFile(i18nFSPath, stringToInsert, "utf8");
			this._parser.resourceModelData.readTexts();
		}
	}

	fileType = {
		xml: "xml",
		controller: "controller",
		jsts: "jsts"
	};
}
