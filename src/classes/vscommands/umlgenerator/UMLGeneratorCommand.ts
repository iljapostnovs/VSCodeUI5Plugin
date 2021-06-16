import { AcornSyntaxAnalyzer } from "../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../UI5Classes/UIClassFactory";
import { DrawIOUMLDiagram } from "./drawiogenerator/DrawIOUMLDiagram";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { UMLGeneratorFactory } from "./UMLGeneratorFactory";
const fileSeparator = path.sep;

export class UMLGeneratorCommand {
	static generateUMLForCurrentClass() {
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		const wsFolder = UMLGeneratorCommand._getWorkspaceFolderOfActiveTextEditor();
		if (activeFileUri && wsFolder) {
			const className = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
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
			fs.writeFileSync(`${wsFolder.uri.fsPath}${fileSeparator}ProjectUML${generator.getFileExtension()}`, diagram, {
				encoding: "utf8"
			});
		}

		vscode.window.showInformationMessage("UML Diagram generated successfully");
	}
}