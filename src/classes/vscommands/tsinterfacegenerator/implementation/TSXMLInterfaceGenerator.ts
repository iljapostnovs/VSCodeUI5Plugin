import { XMLParser } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { UI5Plugin } from "../../../../UI5Plugin";
import { ITSInterfaceGenerator } from "../abstraction/ITSInterfaceGenerator";

export class TSXMLInterfaceGenerator implements ITSInterfaceGenerator {
	async generate() {
		const UI5FileReader = UI5Plugin.getInstance().parser.fileReader;

		const aXMLFiles: IXMLFile[] = UI5FileReader.getAllFragments().concat(UI5FileReader.getAllViews());
		const aInterfaceData = aXMLFiles.map(XMLFile => this._generateInterfaceDataForFile(XMLFile));
		const aUniqueImports = [...new Set(aInterfaceData.flatMap(theInterface => theInterface.imports))].map(toImport => {
			const className = toImport.split("/").pop();
			return `import ${className} from "${toImport}";`;
		});
		const aInterfaces = aInterfaceData.map(interfaceData => {
			return `export interface ${interfaceData.name} {\n\t${interfaceData.rows}\n}`;
		});

		return aUniqueImports.join("\n") + aInterfaces.join("\n\n");
	}
	private _generateInterfaceDataForFile(XMLFile: IXMLFile) {
		const tags = XMLParser.getAllTags(XMLFile);
		const mInterfaceData = tags.reduce((accumulator: {
			import: string[],
			interfaces: string[]
		}, tag) => {
			const attributes = XMLParser.getAttributesOfTheTag(tag);
			const attributeNamesAndValues = attributes?.map(attribute => XMLParser.getAttributeNameAndValue(attribute));
			const idAttribute = attributeNamesAndValues?.find(nameValue => nameValue.attributeName === "id");
			if (idAttribute) {
				const className = XMLParser.getClassNameFromTag(tag.text);
				const fullClassName = XMLParser.getFullClassNameFromTag(tag, XMLFile);

				const idToClass = `${idAttribute.attributeValue}: ${className};`;

				accumulator.import.push(fullClassName.replace(/\./g, "/"));
				accumulator.interfaces.push(idToClass);
			}

			return accumulator;
		}, {
			import: [],
			interfaces: []
		});

		const isView = XMLFile.fsPath.endsWith(".view.xml");
		const interfaceName = XMLFile.name.split(".").pop() + (isView ? "View" : "Fragment");
		const uniqueImports = [...new Set(mInterfaceData.import)];
		const interfaceRows = mInterfaceData.interfaces.join("\n\t");

		return {
			name: interfaceName,
			imports: uniqueImports,
			rows: interfaceRows
		};
	}

}