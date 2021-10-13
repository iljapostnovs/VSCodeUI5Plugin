import { DiagramGenerator } from "../abstraction/DiagramGenerator";
import * as vscode from "vscode";
import { HTTPHandler } from "ui5plugin-parser/dist/classes/utils/HTTPHandler";
import { IEntityType, IAssociation, XMLMetadataParser, IProperty } from "../../../utils/XMLMetadataParser";

export class ERDiagramGenerator extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml"
	}

	async generate() {
		let diagram = "";

		try {
			const XMLData = await this._getCurrentXMLData();
			diagram = this._buildPlantUMLDiagram(XMLData);
		} catch (error) {
			vscode.window.showErrorMessage(`Error in metadata parsing. Details: ${JSON.stringify((<any>error).message || error)}`);
		}

		return diagram;
	}

	private async _getCurrentXMLData() {
		const xmlText = await this._getXMLMetadataText();

		const metadata = new XMLMetadataParser(xmlText);
		return metadata;
	}

	private async _getXMLMetadataText() {
		let XMLMetadata = "";
		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument && activeDocument.fileName.endsWith("metadata.xml")) {
			XMLMetadata = activeDocument.getText();
		} else {
			const uri = await vscode.window.showInputBox({
				prompt: "Please define url to metadata"
			});
			const username = await vscode.window.showInputBox({
				prompt: "Please enter username"
			});
			const password = await vscode.window.showInputBox({
				prompt: "Please enter password",
				password: true
			});

			if (uri && username && password) {
				XMLMetadata = await HTTPHandler.get(uri, {
					auth: {
						username: username,
						password: password
					}
				});
			}
		}

		return XMLMetadata;
	}

	private _buildPlantUMLDiagram(XMLData: XMLMetadataParser) {
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
		} else if (multiplicity === "0..1") {
			if (isFrom) {
				multiplicitySymbolic = "|o";
			} else {
				multiplicitySymbolic = "o|";
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
				const additionalTypeNumbers = this._getAdditionalTypeNumbers(property);
				const isComplexType = property.type.startsWith("Edm.");
				diagram += `\t${isComplexType ? "{field}" : "{method}"} ${keySymbolic}${property.name}: ${property.type}${additionalTypeNumbers}${keySymbolic}\n`;

			});
			diagram += "}";

			return diagram;
		}).join("\n") + "\n}\n";
	}

	private _getAdditionalTypeNumbers(property: IProperty) {
		let additionalTypeNumbers = "";
		if (property.precision || property.scale || property.length) {
			const numbers = [];
			if (property.precision) {
				numbers.push(property.precision);
			}
			if (property.scale) {
				numbers.push(property.scale);
			}
			if (property.length) {
				numbers.push(property.length);
			}

			additionalTypeNumbers = `(${numbers.join(", ")})`;
		}

		return additionalTypeNumbers;
	}
}