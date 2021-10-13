import { JSTypeDocAdapter } from "../../utils/xmlmetadata/JSTypeDocAdapter";
import { XMLMetadataParser } from "../../utils/xmlmetadata/XMLMetadataParser";
import { XMLSourcePrompt } from "../../utils/xmlmetadata/XMLSourcePrompt";
import { IVSCodeCommand } from "../IVSCodeCommand";
import * as vscode from "vscode";

export class GenerateTypeJSDocCommand implements IVSCodeCommand {
	async execute() {
		try {
			const xmlSourcePrompt = new XMLSourcePrompt();
			const XMLData = await xmlSourcePrompt.getXMLMetadataText();
			const metadata = new XMLMetadataParser(XMLData);
			const typeDocAdapter = new JSTypeDocAdapter();
			const typeDoc = typeDocAdapter.fromMetadata(metadata);

			const document = await vscode.workspace.openTextDocument({
				content: typeDoc,
				language: "javascript"
			});
			await vscode.window.showTextDocument(document);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Couldn't parse XML: ${error.message}`);
		}
	}

}