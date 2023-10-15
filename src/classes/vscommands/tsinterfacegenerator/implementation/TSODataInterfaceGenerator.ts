import {
	AXMLMetadataParser,
	IEntityType,
	INavigation,
	TCoordinality
} from "../../../utils/xmlmetadata/AXMLMetadataParser";
import MetadataParserFactory from "../../../utils/xmlmetadata/MetadataParserFactory";
import { XMLMetadataParserV4 } from "../../../utils/xmlmetadata/XMLMetadataParserV4";
import { XMLSourcePrompt } from "../../../utils/xmlmetadata/XMLSourcePrompt";
import { ITSInterfaceGenerator } from "../abstraction/ITSInterfaceGenerator";

export class TSODataInterfaceGenerator implements ITSInterfaceGenerator {
	metadata?: AXMLMetadataParser;
	async generate(XMLData?: string) {
		if (!XMLData) {
			const xmlSourcePrompt = new XMLSourcePrompt();
			[XMLData] = await xmlSourcePrompt.getXMLMetadataText();
		}
		this.metadata = MetadataParserFactory.getInstance(XMLData);
		const aEntityTypeKeyInterfaces = this.metadata.entityTypes.map(entityType =>
			this._buildInterfaceForEntityKeys(entityType)
		);
		const aComplexTypeKeyInterfaces = this.metadata.complexTypes.map(complexType =>
			this._buildInterfaceForEntityKeys(complexType)
		);
		const aEntityTypeInterfaces = this.metadata.entityTypes.map(entityType =>
			this._buildInterfaceForEntity(entityType)
		);
		const aComplexTypeInterfaces = this.metadata.complexTypes.map(complexType =>
			this._buildInterfaceForEntity(complexType)
		);
		const aEntityDataInterfaces = this._buildInterfacesForEntitySets(this.metadata);
		const aFunctionImportInterfaces = this._buildInterfacesForFunctionImports(this.metadata);

		const aInterfaces = [
			aEntityTypeKeyInterfaces,
			aEntityTypeInterfaces,
			aComplexTypeKeyInterfaces,
			aComplexTypeInterfaces,
			aEntityDataInterfaces,
			aFunctionImportInterfaces
		].flat();

		return aInterfaces.join("\n\n");
	}

	private _buildInterfacesForEntitySets(metadata: AXMLMetadataParser) {
		const aInterfaceData = metadata.entityTypes.map(entityType => {
			const entityTypeName = entityType.name;
			const navigations = this._generateNavigations(entityType);

			return `"${entityType.entitySetName}": {\n\t\tkeys: ${entityTypeName}Keys;\n\t\ttype: ${entityTypeName};\n\t\ttypeName: "${entityTypeName}";\n\t\tnavigations: ${navigations};\n\t};`;
		});

		return [`export type EntitySets = {\n\t${aInterfaceData.join("\n\t")}\n};`];
	}

	private _buildInterfacesForFunctionImports(metadata: AXMLMetadataParser) {
		const aInterfaceData = metadata.functionImports.map(functionImport => {
			const params = functionImport.parameters.map(param => {
				const typeFromTypeMap = this._mapType(param.type);
				return `{\n\t\t\tname: "${param.name}",\n\t\t\tlabel: "${
					param.label ?? ""
				}",\n\t\t\ttype: ${typeFromTypeMap}\n\t\t}`;
			});

			return `"${functionImport.name}": {\n\t\treturnType: ${
				functionImport.returnType ?? "void"
			};\n\t\tmethod: "${functionImport.method}";\n\t\tparameters: [${params}];\n\t};`;
		});

		return [`export type FunctionImports = {\n\t${aInterfaceData.join("\n\t")}\n};`];
	}

	private _generateNavigations(entityType: IEntityType) {
		const navigationProperties = entityType.navigations
			.map(navigation => {
				const isMultiple = this._getIsMultiple(navigation.coordinality);

				const entityTypeName =
					isMultiple && navigation.type ? `${navigation.type}[]` : navigation.type ?? "any";
				const navigationName = navigation.name;

				return `\t\t\t"${navigationName}": {\n\t\t\t\ttype: ${entityTypeName}\n\t\t\t};`;
			})
			.join("\n");
		const navigations = `{\n${navigationProperties}\n\t\t}`;
		return navigations;
	}

	private _getIsMultiple(multiplicity: TCoordinality) {
		if (multiplicity === "1..n") {
			return true;
		} else if (multiplicity === "0..1") {
			return false;
		} else if (multiplicity === "1..1") {
			return false;
		} else {
			return false;
		}
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
				return `${description}${keyProperty.name}${keyProperty.nullable ? "?" : ""}: ${this._mapType(
					keyProperty.type
				)};`;
			})
			.join("\n\t");

		theInterface += "\n}";

		return theInterface;
	}

	private _buildInterfaceForEntity(entity: IEntityType) {
		let theInterface = `export interface ${entity.name} extends ${entity.name}Keys {\n\t`;

		theInterface += entity.properties
			.filter(property => !entity.keys.includes(property.name))
			.map(property => {
				let description = property.label || "";
				if (description) {
					description = `/** @description ${description} */\n\t`;
				}
				return `${description}${property.name}${property.nullable ? "?" : ""}: ${this._mapType(
					property.type
				)};`;
			})
			.join("\n\t");
		theInterface +=
			"\n\t" +
			entity.navigations
				.map(navigation => {
					return `${navigation.name}?: ${this._getNavigationType(navigation)};`;
				})
				.join("\n\t");

		theInterface += "\n}";

		return theInterface;
	}

	private _getNavigationType(navigation: INavigation) {
		const isMultiple = this._getIsMultiple(navigation.coordinality);
		if (this.metadata instanceof XMLMetadataParserV4) {
			return navigation ? (isMultiple ? `${navigation?.type}[]` : navigation.type) : "unknown";
		} else {
			return navigation ? (isMultiple ? `{ results: ${navigation?.type}[] }` : navigation.type) : "unknown";
		}
	}

	private _mapType(type: string) {
		const typeFromTypeMap = this._typeMap[type] ?? "string";
		const returnType = typeFromTypeMap.startsWith("Edm.") ? typeFromTypeMap.replace("Edm.", "") : typeFromTypeMap;
		return returnType;
	}

	private readonly _typeMap: { [key: string]: string } = {
		"Edm.Decimal": "string",
		"Edm.Boolean": "boolean",
		"Edm.Double": "string",
		"Edm.Float": "float",
		"Edm.Int": "int",
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
		String: "string",
		"Edm.Time": "string"
	};
}
