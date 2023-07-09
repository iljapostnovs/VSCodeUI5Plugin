import { Range, TextDocument, workspace } from "vscode";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import ExportBase from "./ExportBase";

export interface BulkExportCommandData {
	className: string;
	properties: string[];
	applyToChildren?: boolean;
}
export default class BulkExportToI18NCommand extends ExportBase {
	public async export(document: TextDocument) {
		const ranges = this._generateRangesForExport(document);
		if (ranges.length === 0) {
			throw new Error("No string to export");
		}

		await super.export(document, ranges, false);
	}

	private _generateRangesForExport(document: TextDocument): Range[] {
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (!XMLFile) {
			return [];
		}

		const tags = this._parser.xmlParser.getAllTags(XMLFile);
		const ranges = tags.reduce((ranges: Range[], tag) => {
			const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag) ?? [];
			const tagClassName = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);
			const properties = this._parser.classFactory.getClassProperties(tagClassName);

			const propertyStringAttributes = attributes.filter(attribute => {
				const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				return properties.some(property => property.type === "string" && property.name === attributeName);
			});

			const nonBindingAttributes = propertyStringAttributes.filter(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				return attributeValue && !attributeValue.includes("{") && !attributeValue.includes("}");
			});

			const attributesToExport = nonBindingAttributes.filter(attribute => {
				const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				return this._getIfAttributeShouldBeExported(attributeName, tagClassName);
			});

			const attributeRanges = attributesToExport.map(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const offsetBegin = tag.positionBegin + tag.text.indexOf(attribute) + attribute.indexOf(attributeValue);
				const offsetEnd = offsetBegin + attributeValue.length;

				return new Range(document.positionAt(offsetBegin), document.positionAt(offsetEnd));
			});

			ranges.push(...attributeRanges);

			return ranges;
		}, []);

		return ranges;
	}

	private _getIfAttributeShouldBeExported(attributeName: string, tagClassName: string): boolean {
		const config =
			workspace.getConfiguration("ui5.plugin").get<BulkExportCommandData[]>("bulkExportToi18nCommandData") ?? [];

		const isGloballyAllowed = config.some(entry => {
			return entry.className === "*" && entry.properties.includes(attributeName);
		});

		const isAllowedPrecisely = config.some(entry => {
			return entry.className === tagClassName && entry.properties.includes(attributeName);
		});
		const isAllowedByParent = config.some(entry => {
			return (
				entry.applyToChildren &&
				this._parser.classFactory.isClassAChildOfClassB(tagClassName, entry.className) &&
				entry.properties.includes(attributeName)
			);
		});

		return isGloballyAllowed || isAllowedPrecisely || isAllowedByParent;
	}
}
