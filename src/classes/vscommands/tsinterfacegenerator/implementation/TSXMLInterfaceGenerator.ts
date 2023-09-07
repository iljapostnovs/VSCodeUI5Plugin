import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { ITSInterfaceGenerator } from "../abstraction/ITSInterfaceGenerator";

export class TSXMLInterfaceGenerator extends ParserBearer implements ITSInterfaceGenerator {
	async generate() {
		const fileReader = this._parser.fileReader;

		const aXMLFiles: IXMLFile[] = fileReader
			.getAllFragments()
			.concat(fileReader.getAllViews())
			.sort((xmlFile1, xmlFile2) => {
				if (xmlFile1.fsPath < xmlFile2.fsPath) {
					return -1;
				} else if (xmlFile1.fsPath > xmlFile2.fsPath) {
					return 1;
				} else {
					return 0;
				}
			});
		const mInterfaceData = aXMLFiles.map(XMLFile => this._generateInterfaceDataForFile(XMLFile));
		const aUniqueImportData = [...new Set(mInterfaceData.flatMap(theInterface => theInterface.imports))].map(
			(modulePath, index, allModulePaths) => {
				const moduleName = this._generateUniqueModuleName(modulePath, allModulePaths);
				return {
					moduleName,
					modulePath
				};
			}
		);
		const aUniqueImports = aUniqueImportData
			.map(importData => {
				return `import ${importData.moduleName} from "${importData.modulePath}";`;
			})
			.sort();
		const aInterfaces = mInterfaceData.map(interfaceData => {
			const sExtends = [...new Set(interfaceData.extends)].join(" & ");
			const interfaceRows = interfaceData.rows.map(interfaceData => {
				const moduleName = aUniqueImportData.find(importData => importData.modulePath === interfaceData.module)?.moduleName ?? "";
				return `${interfaceData.id}: ${moduleName};`;
			}).sort().join("\n\t");
			return `export type ${interfaceData.name} = {\n\t${interfaceRows}\n}${sExtends ? " & " + sExtends : ""};`;
		});

		return aUniqueImports.join("\n") + "\n\n" + aInterfaces.join("\n\n");
	}

	private _generateUniqueModuleName(modulePath: string, allModulePaths: string[]) {
		const className = modulePath.split("/").pop();
		const allClassNames = allModulePaths.map(modulePath => modulePath.split("/").pop());
		const sameClassNames = allClassNames.filter(classNameFromAll => classNameFromAll === className);
		if (sameClassNames.length > 1) {
			const allModulePathsWithSameClassName = allModulePaths.filter(modulePath => {
				return modulePath.split("/").pop() === className;
			});
			const iIndex = allModulePathsWithSameClassName.indexOf(modulePath);
			return `${className}${iIndex}`;
		} else {
			return className;
		}
	}

	private _generateInterfaceDataForFile(XMLFile: IXMLFile) {
		const tags = this._parser.xmlParser.getAllTags(XMLFile).filter(tag => !tag.text.startsWith("<!--"));
		const mInterfaceData = tags.reduce(
			(
				accumulator: {
					import: string[];
					interfaces: {
						id: string;
						module: string;
					}[];
				},
				tag
			) => {
				const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
				const attributeNamesAndValues = attributes?.map(attribute =>
					this._parser.xmlParser.getAttributeNameAndValue(attribute)
				);
				const idAttribute = attributeNamesAndValues?.find(nameValue => nameValue.attributeName === "id");
				if (idAttribute) {
					// const className = this._parser.xmlParser.getClassNameFromTag(tag.text);
					const fullClassName = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);

					accumulator.import.push(fullClassName.replace(/\./g, "/"));
					accumulator.interfaces.push({
						id: idAttribute.attributeValue,
						module: fullClassName.replace(/\./g, "/")
					});
				}

				return accumulator;
			},
			{
				import: [],
				interfaces: []
			}
		);

		const isView = XMLFile.fsPath.endsWith(".view.xml");
		const interfaceName = XMLFile.name.split(".").pop() + (isView ? "View" : "Fragment");
		const uniqueImports = [...new Set(mInterfaceData.import)].sort();
		const interfaceRows = mInterfaceData.interfaces.sort();
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
