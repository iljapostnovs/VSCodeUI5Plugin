import { fastXmlParser } from "ui5plugin-parser";
import {
	AXMLMetadataParser,
	IEntityType,
	IFunctionImport,
	INavigation,
	IProperty,
	TCoordinality
} from "./AXMLMetadataParser";

export class XMLMetadataParserV4 extends AXMLMetadataParser {
	readonly functionImports: IFunctionImport[] = [];
	readonly entityTypes: IEntityType[] = [];
	readonly complexTypes: IEntityType[] = [];

	namespace = "";

	constructor(XMLText: string) {
		super();
		const data = this._parseMetadataXML(XMLText);

		this.entityTypes = data.entityTypes;
		this.complexTypes = data.complexTypes;
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
		schemas.forEach((schema: any) => {
			this.namespace = schema["@_Namespace"];
			const entityTypes = this._getArray(schema.EntityType);
			const complexTypes = this._getArray(schema.ComplexType);
			const annotations = this._getArray(schema.Annotations);
			const entitySets = schema.EntityContainer?.EntitySet && this._getArray(schema.EntityContainer.EntitySet);

			parsedEntityTypes.push(...this._parseEntityTypes(entityTypes, entitySets, annotations));
			parsedComplexTypes.push(...this._parseEntityTypes(complexTypes, entitySets, annotations));
		});

		return {
			entityTypes: parsedEntityTypes,
			complexTypes: parsedComplexTypes
		};
	}

	private _parseEntityTypes(entityTypes: any[], entitySets: any[], annotations: any[]): IEntityType[] {
		return entityTypes.map((entityType: any) => {
			const name: string = entityType["@_Name"];
			const keys: string[] = entityType.Key?.PropertyRef["@_Name"]
				? [entityType.Key.PropertyRef["@_Name"]]
				: entityType.Key?.PropertyRef.map((propertyRef: any) => propertyRef["@_Name"]) || [];
			const XMLProperties = this._getArray(entityType.Property);
			let properties: IProperty[] =
				XMLProperties.map((property: any) => {
					const annotation = annotations.find(
						annotation => annotation["@_Target"] === `SAP__self.${name}/${property["@_Name"]}`
					);
					const labelAnnotation = this._getArray(annotation?.Annotation).find(
						(annotation: any) => annotation["@_Term"] === "SAP__common.Label"
					);
					const rawType = property["@_Type"].replace(`${this.namespace}.`, "");
					const isCollection = /Collection(.*?)/.test(rawType);
					const type = isCollection
						? (/(?<=Collection\().*?(?=\))/.exec(rawType)?.[0] ?? rawType) + "[]"
						: rawType;
					return {
						name: property["@_Name"],
						type: type,
						length: property["@_MaxLength"],
						precision: property["@_Precision"],
						scale: property["@_Scale"],
						label: labelAnnotation?.["@_String"],
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
				let coordinality: TCoordinality = "1..n";
				const isToMany = /Collection(.*?)/.test(data["@_Type"]);
				if (!isToMany) {
					if (data["@_Nullable"] === "false") {
						coordinality = "1..1";
					} else {
						coordinality = "0..1";
					}
				}
				return {
					name: data["@_Name"],
					coordinality: coordinality,
					type: (/(?<=Collection\().*?(?=\))/.exec(data["@_Type"])?.[0] ?? data["@_Type"]).replace(
						`${this.namespace}.`,
						""
					)
				};
			});

			const entitySetName = this._getEntitySetName(name, entitySets);

			return { name, properties, keys, navigations, entitySetName };
		});
	}

	private _getArray(something: any | undefined) {
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

	private _getEntitySetName(name: string, entitySets: any[]): string | undefined {
		const entitySet = entitySets.find((entitySet: any) => {
			return entitySet["@_EntityType"].replace(`${this.namespace}.`, "") === name;
		});

		return entitySet && entitySet["@_Name"];
	}
}
