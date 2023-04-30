import * as vscode from "vscode";
import { IAssociation, IEntityType, IProperty, XMLMetadataParser } from "../../../utils/xmlmetadata/XMLMetadataParser";
import { XMLSourcePrompt } from "../../../utils/xmlmetadata/XMLSourcePrompt";
import { DiagramGenerator } from "../abstraction/DiagramGenerator";

export class ERDiagramGenerator extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml";
	}

	async generate() {
		let diagram = "";

		try {
			const xmlSourcePrompt = new XMLSourcePrompt();
			const [XMLData] = await xmlSourcePrompt.getXMLMetadataText();
			const metadata = new XMLMetadataParser(XMLData);
			diagram = this._buildPlantUMLDiagram(metadata);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Error in metadata parsing. Details: ${JSON.stringify((<any>error).message || error)}`
			);
		}

		return diagram;
	}

	private _buildPlantUMLDiagram(XMLData: XMLMetadataParser) {
		let diagram = "@startuml ERDiagram \nskinparam dpi 600\n";

		diagram += this._buildDiagramForEntityTypes(XMLData.entityTypes);
		diagram += this._buildDiagramForEntityTypes(XMLData.complexTypes, "<<Complex Type>> ");
		diagram += this._buildDiagramForAssociations(XMLData.associations, XMLData.entityTypes);
		diagram += this._buildAssociationsBetweenPropertiesAndComplexTypes(
			XMLData.complexTypes,
			XMLData.entityTypes.concat(XMLData.complexTypes)
		);

		diagram += "@enduml";

		return diagram;
	}

	private _buildAssociationsBetweenPropertiesAndComplexTypes(
		complexTypes: IEntityType[],
		entityTypes: IEntityType[]
	) {
		return (
			entityTypes
				.map(entityType => {
					const complexProperties = entityType.properties.filter(
						property => !property.type.startsWith("Edm.")
					);
					const associations =
						complexProperties
							.map(complexProperty => {
								const complexType = complexTypes.find(
									complexType => complexType.name === complexProperty.type
								);
								return `${entityType.name}::${complexProperty.name} -left-> ${complexType?.name}`;
							})
							.join("\n") + "\n";

					return associations;
				})
				.join("\n") + "\n"
		);
	}

	private _buildDiagramForAssociations(associations: IAssociation[], entityTypes: IEntityType[]) {
		return (
			entityTypes
				.flatMap(entityType => {
					return entityType.navigations.map(navigation => {
						const association = associations.find(
							association => association.name === navigation.relationship
						);
						const fromRole =
							association?.from.role === navigation.from ? association?.from : association?.to;
						const toRole = association?.to.role === navigation.to ? association?.to : association?.from;

						const multiplicityTo = this._getMultiplicity(toRole?.multiplicity ?? "1", false);

						return `${fromRole?.type} --${multiplicityTo} ${toRole?.type}: ${navigation.name}`;
					});
				})
				.join("\n") + "\n"
		);
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
		return (
			"together {\n" +
			entityTypes
				.map(entityType => {
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
						diagram += `\t${isComplexType ? "{field}" : "{method}"} ${keySymbolic}${property.name}: ${
							property.type
						}${additionalTypeNumbers}${keySymbolic}\n`;
					});
					diagram += "}";

					return diagram;
				})
				.join("\n") +
			"\n}\n"
		);
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
