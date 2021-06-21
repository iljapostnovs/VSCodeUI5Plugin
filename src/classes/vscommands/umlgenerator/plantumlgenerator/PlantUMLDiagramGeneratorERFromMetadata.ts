import { DiagramGenerator } from "../abstraction/DiagramGenerator";
import * as XMLParser from "fast-xml-parser";
import * as vscode from "vscode";

interface IProperty {
	name: string,
	type: string,
	length?: string,
	precision?: string,
	scale?: string
}

interface IEntityType {
	name: string,
	properties: IProperty[],
	keys: string[]
}

interface IAssociation {
	from: {
		type: string,
		multiplicity: string
	},
	to: {
		type: string,
		multiplicity: string
	}
}

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
	private _buildPlantUMLDiagram(XMLData: { entityTypes: IEntityType[]; complexTypes: IEntityType[]; associations: IAssociation[]; }) {
		let diagram = "@startuml ERDiagram \nskinparam dpi 600\n";

		diagram += this._buildDiagramForEntityTypes(XMLData.entityTypes);
		diagram += this._buildDiagramForEntityTypes(XMLData.complexTypes, "<<Complex Type>> ");
		diagram += this._buildDiagramForAssociations(XMLData.associations);
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

	private _buildDiagramForAssociations(associations: IAssociation[]) {
		return associations.map(association => {
			const multiplicityFrom = this._getMultiplicity(association.from.multiplicity, true);
			const multiplicityTo = this._getMultiplicity(association.to.multiplicity, false);

			return `${association.from.type} ${multiplicityFrom}--${multiplicityTo} ${association.to.type}`;
		}).join("\n") + "\n";
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
			let diagram = `entity ${entityType.name} ${addition}{\n`;
			entityType.properties.forEach(property => {
				const isKey = entityType.keys.includes(property.name);
				const keySymbolic = isKey ? "**" : "";
				diagram += `\t${keySymbolic}${property.name}: ${property.type}${keySymbolic}\n`;

			});
			diagram += "}";
			return diagram;
		}).join("\n") + "\n}\n";
	}

	private _getCurrentXMLData() {
		const activeDocument = vscode.window.activeTextEditor?.document;
		const xmlText = activeDocument?.getText() || "";
		const parsedXML = XMLParser.parse(xmlText, {
			ignoreAttributes: false
		});
		const schema = parsedXML["edmx:Edmx"]["edmx:DataServices"].Schema;
		const namespace = schema["@_Namespace"];
		const entityTypes = schema.EntityType && (Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType]) || [];
		const complexTypes = schema.ComplexType && (Array.isArray(schema.ComplexType) ? schema.ComplexType : [schema.ComplexType]) || [];
		const associations = schema.Association && (Array.isArray(schema.Association) ? schema.Association : [schema.Association]) || [];

		const parsedEntityTypes = this._parseEntityTypes(entityTypes, namespace);
		const parsedComplexTypes = this._parseEntityTypes(complexTypes, namespace);
		const parsedAssociations = this._parseAssociations(associations, namespace);

		return {
			entityTypes: parsedEntityTypes,
			complexTypes: parsedComplexTypes,
			associations: parsedAssociations
		};
	}
	private _parseEntityTypes(entityTypes: any[], namespace: string): IEntityType[] {
		return entityTypes.map((entityType: any) => {
			const name = entityType["@_Name"];
			const keys = entityType.Key?.PropertyRef["@_Name"] ? [entityType.Key.PropertyRef["@_Name"]] : (entityType.Key?.PropertyRef.map((propertyRef: any) => propertyRef["@_Name"]) || []);
			let properties: IProperty[] = entityType.Property.map((property: any) => {
				return {
					name: property["@_Name"],
					type: property["@_Type"].replace(`${namespace}.`, ""),
					length: property["@_MaxLength"],
					precision: property["@_Precision"],
					scale: property["@_Scale"]
				}
			});
			properties = properties.sort((a, b) => {
				const aValue = keys.includes(a.name) ? 1 : 0;
				const bValue = keys.includes(b.name) ? 1 : 0;
				return bValue - aValue;
			});

			return { name, properties, keys };
		});
	}
	private _parseAssociations(associations: any[], namespace: string): IAssociation[] {
		return associations.map((association: any) => {
			const from = {
				type: association.End[0]["@_Type"].replace(`${namespace}.`, ""),
				multiplicity: association.End[0]["@_Multiplicity"]
			};
			const to = {
				type: association.End[1]["@_Type"].replace(`${namespace}.`, ""),
				multiplicity: association.End[1]["@_Multiplicity"]
			};
			return { from, to };
		});
	}
}