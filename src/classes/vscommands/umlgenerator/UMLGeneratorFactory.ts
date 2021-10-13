import * as vscode from "vscode";
import { MassDrawIOUMLDiagram } from "./drawiogenerator/MassDrawIOUMLDiagram";
import { ClassDiagramGenerator } from "./plantumlgenerator/ClassDiagramGenerator";
export class UMLGeneratorFactory {
	static createUMLGenerator() {
		const generationStrategy = vscode.workspace.getConfiguration("ui5.plugin").get("UMLDiagramGenerationStrategy");

		return generationStrategy === "PlantUML" ? new ClassDiagramGenerator() : new MassDrawIOUMLDiagram();
	}
}