import * as vscode from "vscode";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { VSCodeFileReader } from "../../../utils/VSCodeFileReader";

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class XMLCodeLensProvider extends ParserBearer {
	getCodeLenses(document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];

		const componentName = new VSCodeFileReader(this._parser).getComponentNameOfAppInCurrentWorkspaceFolder();
		if (componentName) {
			const currentResourceModelTexts = this._parser.resourceModelData.resourceModels[componentName];
			const XMLText = document.getText();

			const rTranslatedTexts = /(\{|')i18n>.*?(\}|')/g;
			let results = rTranslatedTexts.exec(XMLText);
			while (results) {
				results = results || [];
				if (results && results[0]) {
					results[0] = results[0].replace("'", "{");
					results[0] = results[0].replace("'", "}");
				}
				const positionBegin = document.positionAt(results.index);
				const positionEnd = document.positionAt(results.index + results[0].length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const currentText = currentResourceModelTexts.find(text => text.text === (results || [])[0]);
				if (currentText) {
					const codeLens = new vscode.CodeLens(range, {
						command: "ui5plugin.gotoresourcemodel",
						tooltip: currentText?.description || "",
						arguments: [/(?<=\{i18n>).*?(?=\})/.exec(currentText?.text || "")],
						title: currentText?.description || ""
					});

					codeLenses.push(codeLens);
				}

				results = rTranslatedTexts.exec(XMLText);
			}
		}
		return codeLenses;
	}

	goToResourceModel(textId: string) {
		const manifest = new VSCodeFileReader(this._parser).getCurrentWorkspaceFoldersManifest();
		if (manifest) {
			const resourceModelText = this._parser.fileReader.readResourceModelFile(manifest);
			const rTextPosition = new RegExp(`(?<=${escapeRegExp(textId)}\\s?=).*`);
			const result = rTextPosition.exec(resourceModelText);
			if (result) {
				const resourceModelFSPath = this._parser.fileReader.getResourceModelUriForManifest(manifest);

				const uri = vscode.Uri.file(resourceModelFSPath);
				vscode.window.showTextDocument(uri).then(textEditor => {
					const positionBegin = textEditor.document.positionAt(result.index);
					const positionEnd = textEditor.document.positionAt(result.index + result[0].length);
					textEditor.selection = new vscode.Selection(positionBegin, positionEnd);
					textEditor.revealRange(
						new vscode.Range(positionBegin, positionEnd),
						vscode.TextEditorRevealType.InCenter
					);
				});
			}
		}
	}
}
