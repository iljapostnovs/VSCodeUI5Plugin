import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { DrawIOUMLDiagram } from "./drawiogenerator/DrawIOUMLDiagram";
import * as vscode from "vscode";
import * as fs from "fs";

export class UMLGeneratorCommand {
	static generateUMLForCurrentClass() {
		const className = SyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			const UMLClassDiagram = new DrawIOUMLDiagram(UIClass);
			const diagramXML = UMLClassDiagram.generateUMLClassDiagram();
			fs.writeFileSync(`C:\\Users\\Encraft\\Downloads\\${UIClass.className}.xml`, diagramXML, {
				encoding: "utf8"
			});

			vscode.window.showInformationMessage("UML Diagram generated successfully");
		}
	}
}