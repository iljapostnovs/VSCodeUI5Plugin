import * as fs from "fs";
import * as path from "path";
import { UI5JSParser } from "ui5plugin-parser";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import ParserBearer from "../../ui5parser/ParserBearer";
import { VSCodeFileReader } from "../../utils/VSCodeFileReader";
import { DrawIOUMLDiagram } from "./drawiogenerator/DrawIOUMLDiagram";
import { UMLGeneratorFactory } from "./UMLGeneratorFactory";
const fileSeparator = path.sep;

export class UMLGeneratorCommand extends ParserBearer {
	generateUMLForCurrentClass() {
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		const wsFolder = this._getWorkspaceFolderOfActiveTextEditor();
		if (activeFileUri && wsFolder) {
			const className = new VSCodeFileReader(this._parser).getClassNameOfTheCurrentDocument();
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				if (UIClass instanceof CustomJSClass && this._parser instanceof UI5JSParser) {
					const UMLClassDiagram = new DrawIOUMLDiagram(UIClass, undefined, this._parser);
					const diagramXML = UMLClassDiagram.generateUMLClassDiagram();

					fs.writeFileSync(`${wsFolder.uri.fsPath}${fileSeparator}${UIClass.className}.drawio`, diagramXML, {
						encoding: "utf8"
					});

					vscode.window.showInformationMessage(`UML Diagram for class ${className} generated successfully`);
				}
			}
		} else {
			vscode.window.showInformationMessage(
				"Please open the .js file for which you want to generate the UML Class Diagram"
			);
		}
	}

	private _getWorkspaceFolderOfActiveTextEditor() {
		let wsFolder: vscode.WorkspaceFolder | undefined;
		const wsFolders = vscode.workspace.workspaceFolders || [];
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		if (activeFileUri) {
			wsFolder = wsFolders.find(
				wsFolder => activeFileUri.fsPath.indexOf(`${wsFolder.uri.fsPath}${fileSeparator}`) > -1
			);
		}

		return wsFolder;
	}

	async generateUMLForWholeProject() {
		const generator = UMLGeneratorFactory.createUMLGenerator(this._parser);
		const diagram = await generator.generate(this._parser.workspaceFolder);
		const path = `${this._parser.workspaceFolder.fsPath}${fileSeparator}ProjectUML${generator.getFileExtension()}`;
		fs.writeFileSync(path, diagram, {
			encoding: "utf8"
		});
		const uri = vscode.Uri.file(path);
		const document = await vscode.workspace.openTextDocument(uri);
		vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage("UML Diagram generated successfully");
	}
}
