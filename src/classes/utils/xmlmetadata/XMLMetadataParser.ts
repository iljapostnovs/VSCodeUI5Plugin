import { fastXmlParser } from "ui5plugin-parser";
import { AXMLMetadataParser, IEntityType, IFunctionImport, INavigation, IProperty } from "./AXMLMetadataParser";

export interface IAssociation {
	name: string;
	end: {
		type: string;
		multiplicity: Multiplicity;
		role: string;
	}[];
}

export type Multiplicity = "1" | "*" | "0..1";

export class XMLMetadataParser extends AXMLMetadataParser {
	namespace: string = "";
	readonly entityTypes: IEntityType[] = [];
	readonly complexTypes: IEntityType[] = [];
	readonly functionImports: IFunctionImport[] = [];

	constructor(XMLText: string) {
		super();
		const data = this._parseMetadataXML(XMLText);

		this.entityTypes = data.entityTypes;
		this.complexTypes = data.complexTypes;
		this.functionImports = data.functionImports;
	}

	private _parseMetadataXML(xmlText: string) {
		const parsedXML = new fastXmlParser.XMLParser({
			ignoreAttributes: false
		}).parse(xmlText);
		let schemas = parsedXML["edmx:Edmx"]["edmx:DataServices"].Schema;
		if (!Array.isArray(schemas)) {
			schemas = [schemas];
		}

		const parsedEntityTypes: IEntityType[] = [];
		const parsedComplexTypes: IEntityType[] = [];
		const parsedAssociations: IAssociation[] = [];
		const parsedFunctionImports: IFunctionImport[] = [];
		schemas.forEach((schema: any) => {
			this.namespace = schema["@_Namespace"];
			const entityTypes = this._getArray(schema.EntityType);
			const complexTypes = this._getArray(schema.ComplexType);
			const associations = this._getArray(schema.Association);
			const functionImports = this._getArray(schema.EntityContainer?.FunctionImport);
			const entitySets = this._getArray(schema.EntityContainer?.EntitySet);

			parsedAssociations.push(...this._parseAssociations(associations));
			parsedEntityTypes.push(...this._parseEntityTypes(entityTypes, entitySets, parsedAssociations));
			parsedComplexTypes.push(...this._parseEntityTypes(complexTypes, entitySets, parsedAssociations));
			parsedFunctionImports.push(...this._parseFunctionImports(functionImports));
		});

		return {
			entityTypes: parsedEntityTypes,
			complexTypes: parsedComplexTypes,
			functionImports: parsedFunctionImports
		};
	}

	private _parseFunctionImports(functionImports: any[]): IFunctionImport[] {
		return functionImports.map((functionImport: any) => {
			return {
				name: functionImport["@_Name"],
				returnType: functionImport["@_ReturnType"]?.replace(`${this.namespace}.`, "") ?? "void",
				method: functionImport["@_m:HttpMethod"] ?? "GET",
				parameters: this._getArray(functionImport.Parameter).map(param => {
					return {
						name: param["@_Name"],
						type: param["@_Type"],
						label: param["@_sap:label"]
					};
				})
			};
		});
	}

	private _parseEntityTypes(entityTypes: any[], entitySets: any[], associations: IAssociation[]): IEntityType[] {
		return entityTypes.map((entityType: any) => {
			const name: string = entityType["@_Name"];
			const keys: string[] = entityType.Key?.PropertyRef["@_Name"]
				? [entityType.Key.PropertyRef["@_Name"]]
				: entityType.Key?.PropertyRef.map((propertyRef: any) => propertyRef["@_Name"]) || [];
			const XMLProperties = this._getArray(entityType.Property);
			let properties: IProperty[] =
				XMLProperties.map((property: any) => {
					return {
						name: property["@_Name"],
						type: property["@_Type"].replace(`${this.namespace}.`, ""),
						length: property["@_MaxLength"],
						precision: property["@_Precision"],
						scale: property["@_Scale"],
						label: property["@_sap:label"],
						nullable: property["@_Nullable"] === "true"
					};
				}) || [];
			properties = properties.sort((a, b) => {
				const aValue: 1 | 0 = keys.includes(a.name) ? 1 : 0;
				const bValue: 1 | 0 = keys.includes(b.name) ? 1 : 0;
				return bValue - aValue;
			});

			const navigationData = this._getArray(entityType.NavigationProperty);
			const navigations: INavigation[] = navigationData.map((data: any): INavigation => {
				const relationship = data["@_Relationship"].replace(`${this.namespace}.`, "");
				const association = associations.find(association => association.name === relationship);
				const to = association?.end.find(end => end.role === data["@_ToRole"]);
				const toType = to?.type.replace(`${this.namespace}.`, "") ?? "";
				const coordinalityFrom = "1";
				const coordinalityTo = to?.multiplicity === "*" ? "n" : "1";
				return {
					name: data["@_Name"],
					type: toType,
					coordinality: `${coordinalityFrom}..${coordinalityTo}`
				};
			});

			const entitySetName = this._getEntitySetName(name, entitySets);

			return { name, properties, keys, navigations, entitySetName };
		});
	}

	private _getArray(something: any) {
		const myArray: any[] = [];

		if (something) {
			if (Array.isArray(something)) {
				myArray.push(...something);
			} else {
				myArray.push(something);
			}
		}

		return myArray;
	}

	private _getEntitySetName(name: any, entitySets: any[]): string | undefined {
		const entitySet = entitySets.find((entitySet: any) => {
			return entitySet["@_EntityType"].replace(`${this.namespace}.`, "") === name;
		});

		return entitySet && entitySet["@_Name"];
	}
	private _parseAssociations(associations: any[]): IAssociation[] {
		return associations.map((association: any) => {
			const ends = this._getArray(association.End);
			const name = association["@_Name"];
			const parsedEnds = ends.map(end => {
				return {
					type: end["@_Type"].replace(`${this.namespace}.`, ""),
					multiplicity: end["@_Multiplicity"],
					role: end["@_Role"]
				};
			});
			return { name, end: parsedEnds };
		});
	}
}
