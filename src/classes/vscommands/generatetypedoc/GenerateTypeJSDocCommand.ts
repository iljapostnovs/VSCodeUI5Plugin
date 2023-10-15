import { writeFile } from "fs/promises";
import { join } from "path";
import * as vscode from "vscode";
import { ReusableMethods } from "../../providers/reuse/ReusableMethods";
import { JSTypeDocAdapter } from "../../utils/xmlmetadata/JSTypeDocAdapter";
import MetadataParserFactory from "../../utils/xmlmetadata/MetadataParserFactory";
import { XMLSourcePrompt } from "../../utils/xmlmetadata/XMLSourcePrompt";
import { IVSCodeCommand } from "../IVSCodeCommand";

export class GenerateTypeJSDocCommand implements IVSCodeCommand {
	async execute() {
		try {
			const xmlSourcePrompt = new XMLSourcePrompt();
			const [XMLData] = await xmlSourcePrompt.getXMLMetadataText();
			const metadata = MetadataParserFactory.getInstance(XMLData);
			const typeDocAdapter = new JSTypeDocAdapter();
			const content = typeDocAdapter.fromMetadata(metadata);

			const relativePath = vscode.workspace.getConfiguration("ui5.plugin").get<string>("JSTypeDefDocPath");
			const parser = ReusableMethods.getParserForCurrentActiveDocument();
			let document: vscode.TextDocument;
			if (relativePath && parser) {
				const absolutePath = join(parser.workspaceFolder.fsPath, relativePath);
				await writeFile(absolutePath, content, {
					encoding: "utf8"
				});
				const uri = vscode.Uri.file(absolutePath);
				document = await vscode.workspace.openTextDocument(uri);
			} else {
				document = await vscode.workspace.openTextDocument({
					content: content,
					language: "javascript"
				});
			}
			await vscode.window.showTextDocument(document);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Couldn't parse XML: ${error.message}`);
		}
	}
}
