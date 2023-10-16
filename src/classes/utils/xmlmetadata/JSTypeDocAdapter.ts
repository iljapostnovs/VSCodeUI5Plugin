import { AXMLMetadataParser, IEntityType } from "./AXMLMetadataParser";
import { EdmTypes } from "./EdmTypes";
import { XMLMetadataParserV4 } from "./XMLMetadataParserV4";

export class JSTypeDocAdapter {
	metadata?: AXMLMetadataParser;
	fromMetadata(metadata: AXMLMetadataParser) {
		this.metadata = metadata;
		return this._buildTypeDef(metadata.entityTypes) + "\n\n" + this._buildTypeDef(metadata.complexTypes);
	}

	private _buildTypeDef(entityTypes: IEntityType[]) {
		return entityTypes
			.map(entityType => {
				const sTypeDefStart = "/**\n";
				const sTypeDefEnd = "\n */";
				const sTypeDefName = ` * @typedef ${entityType.name}\n`;
				const sRow = entityType.properties
					.map(property => {
						return ` * @property {${this._mapType(property.type)}} ${property.name}${
							property.label ? ` - ${property.label}` : ""
						}`;
					})
					.join("\n");

				return sTypeDefStart + sTypeDefName + sRow + sTypeDefEnd;
			})
			.join("\n\n");
	}

	private _mapType(type: string) {
		const typeFromTypeMap =
			(this.metadata instanceof XMLMetadataParserV4 ? this._typeMapV4[type] : this._typeMapV2[type]) ?? "string";
		const returnType = typeFromTypeMap.startsWith("Edm.") ? typeFromTypeMap.replace("Edm.", "") : typeFromTypeMap;
		return returnType;
	}

	private readonly _typeMapV2: { [key: string]: string } = EdmTypes.typeMapV2;

	private readonly _typeMapV4: { [key: string]: string } = EdmTypes.typeMapV4;
}
