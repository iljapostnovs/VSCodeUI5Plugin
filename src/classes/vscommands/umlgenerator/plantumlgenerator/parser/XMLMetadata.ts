
import * as XMLParser from "fast-xml-parser";

export interface IProperty {
	name: string,
	type: string,
	length?: string,
	precision?: string,
	scale?: string
}

export interface IEntityType {
	name: string,
	properties: IProperty[],
	keys: string[],
	navigations: INavigation[],
	entitySetName?: string
}

export interface IAssociation {
	name: string;
	from: {
		type: string,
		multiplicity: string,
		role: string
	},
	to: {
		type: string,
		multiplicity: string,
		role: string
	}
}

export interface INavigation {
	name: string,
	relationship: string,
	from: string,
	to: string
}

export class XMLMetadata {
	readonly associations: IAssociation[] = [];
	readonly entityTypes: IEntityType[] = [];
	readonly complexTypes: IEntityType[] = [];

	constructor(XMLText: string) {
		const data = this._parseMetadataXML(XMLText);

		this.associations = data.associations;
		this.entityTypes = data.entityTypes;
		this.complexTypes = data.complexTypes;
	}

	private _parseMetadataXML(xmlText: string) {
		const parsedXML = XMLParser.parse(xmlText, {
			ignoreAttributes: false
		});
		const schema = parsedXML["edmx:Edmx"]["edmx:DataServices"].Schema;
		const namespace = schema["@_Namespace"];
		const entityTypes = schema.EntityType && (Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType]) || [];
		const complexTypes = schema.ComplexType && (Array.isArray(schema.ComplexType) ? schema.ComplexType : [schema.ComplexType]) || [];
		const associations = schema.Association && (Array.isArray(schema.Association) ? schema.Association : [schema.Association]) || [];
		const entitySets = schema.EntityContainer?.EntitySet && (Array.isArray(schema.EntityContainer.EntitySet) ? schema.EntityContainer.EntitySet : [schema.EntityContainer.EntitySet]) || [];

		const parsedEntityTypes = this._parseEntityTypes(entityTypes, namespace, entitySets);
		const parsedComplexTypes = this._parseEntityTypes(complexTypes, namespace, entitySets);
		const parsedAssociations = this._parseAssociations(associations, namespace);

		return {
			entityTypes: parsedEntityTypes,
			complexTypes: parsedComplexTypes,
			associations: parsedAssociations
		};
	}

	private _parseEntityTypes(entityTypes: any[], namespace: string, entitySets: any[]): IEntityType[] {
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

			const navigationData = entityType.NavigationProperty && (Array.isArray(entityType.NavigationProperty) ? entityType.NavigationProperty : [entityType.NavigationProperty]) || [];
			const navigations: INavigation[] = navigationData.map((data: any): INavigation => {
				return {
					name: data["@_Name"],
					relationship: data["@_Relationship"].replace(`${namespace}.`, ""),
					from: data["@_FromRole"],
					to: data["@_ToRole"]
				}
			});

			const entitySetName = this._getEntitySetName(name, entitySets, namespace);

			return { name, properties, keys, navigations, entitySetName };
		});
	}
	private _getEntitySetName(name: any, entitySets: any[], namespace: string): string | undefined {
		const entitySet = entitySets.find((entitySet: any) => {
			return entitySet["@_EntityType"].replace(`${namespace}.`, "") === name
		});

		return entitySet && entitySet["@_Name"];
	}
	private _parseAssociations(associations: any[], namespace: string): IAssociation[] {
		return associations.map((association: any) => {
			const name = association["@_Name"];
			const from = {
				type: association.End[0]["@_Type"].replace(`${namespace}.`, ""),
				multiplicity: association.End[0]["@_Multiplicity"],
				role: association.End[0]["@_Role"]
			};
			const to = {
				type: association.End[1]["@_Type"].replace(`${namespace}.`, ""),
				multiplicity: association.End[1]["@_Multiplicity"],
				role: association.End[1]["@_Role"]
			};
			return { name, from, to };
		});
	}
}