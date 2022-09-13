import { XMLParser } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { UI5Plugin } from "../../../../UI5Plugin";
import { ITSInterfaceGenerator } from "../abstraction/ITSInterfaceGenerator";

export class TSXMLInterfaceGenerator implements ITSInterfaceGenerator {
	async generate() {
		const UI5FileReader = UI5Plugin.getInstance().parser.fileReader;

		const aXMLFiles: IXMLFile[] = UI5FileReader.getAllFragments().concat(UI5FileReader.getAllViews());
		const mInterfaceData = aXMLFiles.map(XMLFile => this._generateInterfaceDataForFile(XMLFile));
		const aUniqueImports = [...new Set(mInterfaceData.flatMap(theInterface => theInterface.imports))].map(toImport => {
			const className = toImport.split("/").pop();
			return `import ${className} from "${toImport}";`;
		});
		const aInterfaces = mInterfaceData.map(interfaceData => {
			const sExtends = [... new Set(interfaceData.extends)].join(", ");
			return `export interface ${interfaceData.name}${sExtends ? ` extends ${sExtends}` : ""} {\n\t${interfaceData.rows}\n}`;
		});

		return aUniqueImports.join("\n") + "\n\n" + aInterfaces.join("\n\n");
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
		const aExtends = XMLFile.fragments.map(fragment => {
			const isView = fragment.fsPath.endsWith(".view.xml");
			const interfaceName = fragment.name.split(".").pop() + (isView ? "View" : "Fragment");

			return interfaceName;
		});

		return {
			name: interfaceName,
			imports: uniqueImports,
			rows: interfaceRows,
			extends: aExtends
		};
	}

}