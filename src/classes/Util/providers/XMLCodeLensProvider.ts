import * as vscode from "vscode";
import { ResourceModelData } from "../../CustomLibMetadata/ResourceModelData";
import { FileReader } from "../FileReader";

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class XMLCodeLensProvider {
	static getCodeLenses(document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];

		const componentName = FileReader.getComponentNameOfAppInCurrentWorkspaceFolder();
		if (componentName) {
			const currentResourceModelTexts = ResourceModelData.resourceModels[componentName];
			const XMLText = document.getText();

			const rTranslatedTexts = /\{i18n>.*?\}/g;
			let results = rTranslatedTexts.exec(XMLText);
			while (results) {
				const positionBegin = document.positionAt(results.index);
				const positionEnd = document.positionAt(results.index + results[0].length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const currentText = currentResourceModelTexts.find(text => text.text === (results || [])[0]);
				const codeLens = new vscode.CodeLens(range, {
					command: "ui5plugin.gotoresourcemodel",
					tooltip: currentText?.description || "",
					arguments: [/(?<=\{i18n>).*?(?=\})/.exec(currentText?.text || "")],
					title: currentText?.description || ""
				});

				codeLenses.push(codeLens);
				results = rTranslatedTexts.exec(XMLText);
			}
		}
		return codeLenses;
	}

	static goToResourceModel(textId: string) {
		const manifest = FileReader.getCurrentWorkspaceFoldersManifest();
		if (manifest) {
			const resourceModelText = FileReader.readResourceModelFile(manifest);
			const rTextPosition = new RegExp(`(?<=${escapeRegExp(textId)}\\s?=).*`);
			const result = rTextPosition.exec(resourceModelText);
			if (result) {
				const resourceModelFSPath = FileReader.getResourceModelUriForManifest(manifest);

				const uri = vscode.Uri.file(resourceModelFSPath);
				vscode.window.showTextDocument(uri)
				.then(textEditor => {
					const positionBegin = textEditor.document.positionAt(result.index);
					const positionEnd = textEditor.document.positionAt(result.index + result[0].length);
					textEditor.selection = new vscode.Selection(positionBegin, positionEnd);
					textEditor.revealRange(new vscode.Range(positionBegin, positionEnd), vscode.TextEditorRevealType.InCenter);
				});
			}
		}
	}
}