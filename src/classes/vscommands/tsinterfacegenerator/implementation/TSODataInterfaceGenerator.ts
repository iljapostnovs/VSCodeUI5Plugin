import { IAssociation, IEntityType, INavigation, XMLMetadataParser } from "../../../utils/xmlmetadata/XMLMetadataParser";
import { XMLSourcePrompt } from "../../../utils/xmlmetadata/XMLSourcePrompt";
import { ITSInterfaceGenerator } from "../abstraction/ITSInterfaceGenerator";

export class TSODataInterfaceGenerator implements ITSInterfaceGenerator {
	async generate() {
		const xmlSourcePrompt = new XMLSourcePrompt();
		const XMLData = await xmlSourcePrompt.getXMLMetadataText();
		const metadata = new XMLMetadataParser(XMLData);
		const aEntityTypeKeyInterfaces = metadata.entityTypes.map(entityType => this._buildInterfaceForEntityKeys(entityType));
		const aComplexTypeKeyInterfaces = metadata.complexTypes.map(complexType => this._buildInterfaceForEntityKeys(complexType));
		const aEntityTypeInterfaces = metadata.entityTypes.map(entityType => this._buildInterfaceForEntity(entityType, metadata.associations));
		const aComplexTypeInterfaces = metadata.complexTypes.map(complexType => this._buildInterfaceForEntity(complexType, metadata.associations));
		const aEntityDataInterfaces = this._buildInterfacesForEntitySets(metadata);

		const aInterfaces = [
			aEntityTypeKeyInterfaces,
			aEntityTypeInterfaces,
			aComplexTypeKeyInterfaces,
			aComplexTypeInterfaces,
			aEntityDataInterfaces
		].flat();

		return aInterfaces.join("\n\n");
	}

	private _buildInterfacesForEntitySets(metadata: XMLMetadataParser) {
		const aInterfaceData = metadata.entityTypes.map(entityType => {
			const entityTypeName = entityType.name;
			return `"${entityType.entitySetName}": {\n\t\tkeys: ${entityTypeName}Keys;\n\t\ttype: ${entityTypeName};\n\t\ttypeName: "${entityTypeName}";\n\t};`
		});

		return [`export type EntitySets = {\n\t${aInterfaceData.join("\n\t")}\n};`];
	}

	private _buildInterfaceForEntityKeys(entity: IEntityType) {
		let theInterface = `export interface ${entity.name}Keys {\n\t`;

		theInterface += entity.properties
			.filter(property => entity.keys.includes(property.name))
			.map(keyProperty => {
				let description = keyProperty.label || "";
				if (description) {
					description = `/** @description ${description} */\n\t`;
				}
				return `${description}${keyProperty.name}${keyProperty.nullable ? "?" : ""}: ${this._mapType(keyProperty.type)};`;
			}).join("\n\t");

		theInterface += "\n}";

		return theInterface;
	}

	private _buildInterfaceForEntity(entity: IEntityType, associations: IAssociation[]) {
		let theInterface = `export interface ${entity.name} extends ${entity.name}Keys {\n\t`;

		theInterface += entity.properties
			.filter(property => !entity.keys.includes(property.name))
			.map(property => {
				let description = property.label || "";
				if (description) {
					description = `/** @description ${description} */\n\t`;
				}
				return `${description}${property.name}${property.nullable ? "?" : ""}: ${this._mapType(property.type)};`;
			}).join("\n\t");
		theInterface += "\n\t" + entity.navigations.map(navigation => {
			return `${navigation.name}?: ${this._getNavigationType(navigation, associations)};`;
		}).join("\n\t");

		theInterface += "\n}";

		return theInterface;
	}

	private _getNavigationType(navigation: INavigation, associations: IAssociation[]) {
		const association = associations.find(assoc => assoc.name === navigation.relationship);
		const role = navigation.to === association?.to.role ? association?.to : association?.from;
		const isMultiple = role?.multiplicity === "*";

		return role ? isMultiple ? `{ results: ${role?.type}[] }` : role.type : "unknown";
	}

	private _mapType(type: string) {
		const typeFromTypeMap = this._typeMap[type] || type;
		const returnType = typeFromTypeMap.startsWith("Edm.") ? typeFromTypeMap.replace("Edm.", "") : typeFromTypeMap;
		return returnType;
	}

	private readonly _typeMap: { [key: string]: string } = {
		"Edm.Decimal": "string",
		"Edm.Boolean": "boolean",
		"Edm.Double": "string",
		"Edm.Float": "float",
		"Edm.Int16": "int",
		"Edm.Int32": "int",
		"Edm.Int64": "string",
		"Edm.Guid": "string",
		"Edm.Binary": "string",
		"Edm.DateTime": "Date",
		"Edm.Date": "Date",
		"Edm.DateTimeOffset": "string",
		"Edm.Byte": "string",
		"Edm.SByte": "string",
		"Edm.Single": "string",
		"Edm.String": "string",
		"Edm.Time": "string"
	}

}