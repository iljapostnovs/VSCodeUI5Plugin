import { writeFile } from "fs/promises";
import { join } from "path";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";
import { ERDiagramGenerator } from "./plantumlgenerator/ERDiagramGenerator";
export class GenerateERDiagramCommand extends ParserBearer {
	async generateERDiagram() {
		const generator = new ERDiagramGenerator(this._parser);
		const content = await generator.generate();
		const relativePath = vscode.workspace.getConfiguration("ui5.plugin").get<string>("ERDiagramPath");
		let document: vscode.TextDocument;
		if (relativePath) {
			const absolutePath = join(this._parser.workspaceFolder.fsPath, relativePath);
			await writeFile(absolutePath, content, {
				encoding: "utf8"
			});
			const uri = vscode.Uri.file(absolutePath);
			document = await vscode.workspace.openTextDocument(uri);
		} else {
			document = await vscode.workspace.openTextDocument({
				content: content,
				language: "plantuml"
			});
		}
		await vscode.window.showTextDocument(document);
	}
}
