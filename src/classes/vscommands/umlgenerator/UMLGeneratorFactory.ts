import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { MassDrawIOUMLDiagram } from "./drawiogenerator/MassDrawIOUMLDiagram";
import { ClassDiagramGenerator } from "./plantumlgenerator/ClassDiagramGenerator";
export class UMLGeneratorFactory {
	static createUMLGenerator(parser: IUI5Parser) {
		const generationStrategy = vscode.workspace.getConfiguration("ui5.plugin").get("UMLDiagramGenerationStrategy");

		return generationStrategy === "PlantUML" ? new ClassDiagramGenerator(parser) : new MassDrawIOUMLDiagram(parser);
	}
}