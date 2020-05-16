import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { DrawIOUMLDiagram } from "./drawiogenerator/DrawIOUMLDiagram";
import * as vscode from "vscode";
import * as fs from "fs";
import { MassDrawIOUMLDiagram } from "./drawiogenerator/MassDrawIOUMLDiagram";
import * as path from "path";
const fileSeparator = path.sep;

export class UMLGeneratorCommand {
	static generateUMLForCurrentClass() {
		const activeFileUri = vscode.window.activeTextEditor?.document.uri;
		if (activeFileUri) {

			const className = SyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			if (className) {
				const UIClass = UIClassFactory.getUIClass(className);
				const UMLClassDiagram = new DrawIOUMLDiagram(UIClass);
				const diagramXML = UMLClassDiagram.generateUMLClassDiagram();

				fs.writeFileSync(`${activeFileUri.fsPath}${fileSeparator}${UIClass.className}.xml`, diagramXML, {
					encoding: "utf8"
				});

			}
		} else {
			vscode.window.showInformationMessage("Please open the .js file for which you want to generate the UML Class Diagram");
		}
	}

	static async generateUMLForWholeProject() {
		const wsFolders = vscode.workspace.workspaceFolders || [];

		for (const wsFolder of wsFolders) {
			const diagramXML = await MassDrawIOUMLDiagram.generateUMLClassDiagrams(wsFolder);
			fs.writeFileSync(`${wsFolder.uri.fsPath}${fileSeparator}ProjectUML.xml`, diagramXML, {
				encoding: "utf8"
			});
		}

		vscode.window.showInformationMessage("UML Diagram generated successfully");
	}
}