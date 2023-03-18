import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";
import { ERDiagramGenerator } from "./plantumlgenerator/ERDiagramGenerator";
const fileSeparator = path.sep;
export class GenerateERDiagramCommand extends ParserBearer {
	async generateERDiagram() {
		const generator = new ERDiagramGenerator(this._parser);
		const diagram = await generator.generate();
		const document = vscode.window.activeTextEditor?.document;
		const workspace = document && vscode.workspace.getWorkspaceFolder(document.uri);
		if (workspace && diagram) {
			const path = `${workspace.uri.fsPath}${fileSeparator}ERMetadata${generator.getFileExtension()}`;
			fs.writeFileSync(path, diagram, {
				encoding: "utf8"
			});
			const uri = vscode.Uri.file(path);
			const document = await vscode.workspace.openTextDocument(uri);
			vscode.window.showTextDocument(document);
			vscode.window.showInformationMessage("ER Diagram generated successfully");
		}
	}
}
