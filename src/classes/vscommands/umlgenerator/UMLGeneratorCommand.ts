import { DrawIOUMLDiagram } from "./drawiogenerator/DrawIOUMLDiagram";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
const fileSeparator = path.sep;
import { UMLGeneratorFactory } from "./UMLGeneratorFactory";
import { UI5Plugin } from "../../../UI5Plugin";
import { VSCodeFileReader } from "../../utils/VSCodeFileReader";

export class UMLGeneratorCommand {
	static generateUMLForCurrentClass() {
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		const wsFolder = UMLGeneratorCommand._getWorkspaceFolderOfActiveTextEditor();
		if (activeFileUri && wsFolder) {
			const className = VSCodeFileReader.getClassNameOfTheCurrentDocument();
			if (className) {
				const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
				const UMLClassDiagram = new DrawIOUMLDiagram(UIClass);
				const diagramXML = UMLClassDiagram.generateUMLClassDiagram();

				fs.writeFileSync(`${wsFolder.uri.fsPath}${fileSeparator}${UIClass.className}.drawio`, diagramXML, {
					encoding: "utf8"
				});

				vscode.window.showInformationMessage(`UML Diagram for class ${className} generated successfully`);
			}
		} else {
			vscode.window.showInformationMessage("Please open the .js file for which you want to generate the UML Class Diagram");
		}
	}

	private static _getWorkspaceFolderOfActiveTextEditor() {
		let wsFolder: vscode.WorkspaceFolder | undefined;
		const wsFolders = vscode.workspace.workspaceFolders || [];
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		if (activeFileUri) {
			wsFolder = wsFolders.find(wsFolder => activeFileUri.fsPath.indexOf(`${wsFolder.uri.fsPath}${fileSeparator}`) > -1);
		}

		return wsFolder;
	}

	static async generateUMLForWholeProject() {
		const wsFolders = vscode.workspace.workspaceFolders || [];
		for (const wsFolder of wsFolders) {
			const generator = UMLGeneratorFactory.createUMLGenerator();
			const diagram = await generator.generateUMLClassDiagrams(wsFolder);
			const path = `${wsFolder.uri.fsPath}${fileSeparator}ProjectUML${generator.getFileExtension()}`;
			fs.writeFileSync(path, diagram, {
				encoding: "utf8"
			});
			const uri = vscode.Uri.file(path);
			const document = await vscode.workspace.openTextDocument(uri);
			vscode.window.showTextDocument(document);
		}

		vscode.window.showInformationMessage("UML Diagram generated successfully");
	}
}