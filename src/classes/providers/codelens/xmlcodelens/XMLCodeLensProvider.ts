import * as vscode from "vscode";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { VSCodeFileReader } from "../../../utils/VSCodeFileReader";

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

	goToResourceModel(translationId: string) {
		const manifest = new VSCodeFileReader(this._parser).getCurrentWorkspaceFoldersManifest();
		if (manifest) {
			const resourceModelFile = this._parser.resourceModelData.resourceModels[manifest.componentName];
			const translation = resourceModelFile.find(translation => translation.id === translationId);
			if (!translation) {
				return;
			}
			const resourceModelFSPath = this._parser.fileReader.getResourceModelUriForManifest(manifest);

			const uri = vscode.Uri.file(resourceModelFSPath);
			vscode.window.showTextDocument(uri).then(textEditor => {
				const positionBegin = textEditor.document.positionAt(translation.positionBegin);
				const positionEnd = textEditor.document.positionAt(translation.positionEnd);
				textEditor.selection = new vscode.Selection(positionBegin, positionEnd);
				textEditor.revealRange(
					new vscode.Range(positionBegin, positionEnd),
					vscode.TextEditorRevealType.InCenter
				);
			});
		}
	}
}
