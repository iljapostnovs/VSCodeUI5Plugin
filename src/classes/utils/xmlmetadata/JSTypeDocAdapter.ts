import { IEntityType, XMLMetadataParser } from "./XMLMetadataParser";

export class JSTypeDocAdapter {
	fromMetadata(metadata: XMLMetadataParser) {
		return this._buildTypeDef(metadata.entityTypes) + "\n\n" + this._buildTypeDef(metadata.complexTypes);
	}

	private _buildTypeDef(entityTypes: IEntityType[]) {
		return entityTypes.map(entityType => {
			const sTypeDefStart = "/**\n";
			const sTypeDefEnd = "\n */";
			const sTypeDefName = ` * @typedef ${entityType.name}\n`;
			const sRow = entityType.properties.map(property => {
				return ` * @property {${this._mapType(property.type)}} ${property.name}${property.label ? ` - ${property.label}` : ""}`;

			}).join("\n");

			return sTypeDefStart + sTypeDefName + sRow + sTypeDefEnd;
		}).join("\n\n");
	}

	private _mapType(type: string) {
		const typeFromTypeMap = this._typeMap[type] || type;
		const returnType = typeFromTypeMap.startsWith("Edm.") ? typeFromTypeMap.replace("Edm.", "") : typeFromTypeMap;
		return returnType;
	}

	private readonly _typeMap: { [key: string]: string } = {
		"Edm.Decimal": "string",
		"Edm.Boolean": "boolean",
		"Edm.Double": "float",
		"Edm.Float": "float",
		"Edm.Int16": "int",
		"Edm.Int32": "int",
		"Edm.Int64": "string",
		"Edm.Byte": "int",
		"Edm.Guid": "string",
		"Edm.DateTime": "Date",
		"Edm.Date": "Date",
		"Edm.DateTimeOffset": "string",
		"Edm.SByte": "int",
		"Edm.Single": "float",
		"Edm.String": "string",
		"Edm.Time": "string"
	}
}