import { DiagramGenerator } from "../abstraction/DiagramGenerator";
import * as vscode from "vscode";
import { IEntityType, IAssociation, XMLMetadata } from "./parser/XMLMetadata";

export class PlantUMLDiagramGeneratorERFromMetadata extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml"
	}

	async generateUMLClassDiagrams() {
		let diagram = "";
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument && activeDocument.fileName.endsWith("metadata.xml")) {

			try {
				const XMLData = this._getCurrentXMLData();
				diagram = this._buildPlantUMLDiagram(XMLData);
			} catch (error) {
				vscode.window.showErrorMessage(`Error in metadata parsing. Details: ${JSON.stringify(error.message || error)}`);
			}
		} else {
			vscode.window.showErrorMessage("Current active document is not metadata.xml");
		}

		return diagram;
	}
	private _getCurrentXMLData() {
		const activeDocument = vscode.window.activeTextEditor?.document;
		const xmlText = activeDocument?.getText() || "";
		const metadata = new XMLMetadata(xmlText);
		return metadata;
	}

	private _buildPlantUMLDiagram(XMLData: XMLMetadata) {
		let diagram = "@startuml ERDiagram \nskinparam dpi 600\n";

		diagram += this._buildDiagramForEntityTypes(XMLData.entityTypes);
		diagram += this._buildDiagramForEntityTypes(XMLData.complexTypes, "<<Complex Type>> ");
		diagram += this._buildDiagramForAssociations(XMLData.associations, XMLData.entityTypes);
		diagram += this._buildAssociationsBetweenPropertiesAndComplexTypes(XMLData.complexTypes, XMLData.entityTypes.concat(XMLData.complexTypes));

		diagram += "@enduml";

		return diagram;
	}

	private _buildAssociationsBetweenPropertiesAndComplexTypes(complexTypes: IEntityType[], entityTypes: IEntityType[]) {
		return entityTypes.map(entityType => {
			const complexProperties = entityType.properties.filter(property => !property.type.startsWith("Edm."));
			const associations = complexProperties.map(complexProperty => {
				const complexType = complexTypes.find(complexType => complexType.name === complexProperty.type);
				return `${entityType.name}::${complexProperty.name} -left-> ${complexType?.name}`;
			}).join("\n") + "\n";

			return associations;
		}).join("\n") + "\n";
	}

	private _buildDiagramForAssociations(associations: IAssociation[], entityTypes: IEntityType[]) {
		return associations.map(association => {
			const multiplicityFrom = this._getMultiplicity(association.from.multiplicity, true);
			const multiplicityTo = this._getMultiplicity(association.to.multiplicity, false);
			const navigationName = this._getNavigationName(association, entityTypes);

			return `${association.from.type} ${multiplicityFrom}--${multiplicityTo} ${association.to.type}${navigationName}`;
		}).join("\n") + "\n";
	}

	private _getNavigationName(association: IAssociation, entityTypes: IEntityType[]) {
		const entityTypeFrom = entityTypes.find(entityType => entityType.name === association.from.type);
		const navigation = entityTypeFrom?.navigations.find(navigation => {
			return navigation.relationship === association.name;
		});

		return navigation ? `: ${navigation.name}` : "";
	}

	private _getMultiplicity(multiplicity: string, isFrom: boolean) {
		let multiplicitySymbolic = "";

		if (multiplicity === "1") {
			multiplicitySymbolic = "||";
		} else if (multiplicity === "*") {
			if (isFrom) {
				multiplicitySymbolic = "}|";
			} else {
				multiplicitySymbolic = "|{";
			}
		}

		return multiplicitySymbolic;
	}

	private _buildDiagramForEntityTypes(entityTypes: IEntityType[], addition = "") {
		return "together {\n" + entityTypes.map(entityType => {
			let setName = "";
			if (!addition && entityType.entitySetName) {
				setName = `<<${entityType.entitySetName}>> `;
			}

			let diagram = `entity ${entityType.name} ${addition}${setName}{\n`;
			entityType.properties.forEach(property => {
				const isKey = entityType.keys.includes(property.name);
				const keySymbolic = isKey ? "**" : "";
				diagram += `\t${keySymbolic}${property.name}: ${property.type}${keySymbolic}\n`;

			});
			diagram += "}";
			return diagram;
		}).join("\n") + "\n}\n";
	}
}