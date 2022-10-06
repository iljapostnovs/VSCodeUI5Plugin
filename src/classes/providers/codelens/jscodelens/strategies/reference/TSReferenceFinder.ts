import { ConstructorDeclaration } from "ts-morph";
import { RangeAdapter } from "ui5plugin-linter";
import { IRange } from "ui5plugin-linter/dist/classes/Linter";
import { XMLParser } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import {
	CustomTSClass,
	ICustomClassTSField,
	ICustomClassTSMethod
} from "../../../../../../typescript/parsing/classes/CustomTSClass";
import { UI5TSParser } from "../../../../../../typescript/parsing/UI5TSParser";
export interface ILocation {
	filePath: string;
	range: IRange;
}
export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: ILocation[];
	};
}

export class TSReferenceFinder {
	protected readonly _parser: UI5TSParser;
	constructor(parser: UI5TSParser) {
		this._parser = parser;
	}
	public getReferenceLocations(member: ICustomClassTSMethod | ICustomClassTSField) {
		const locations: ILocation[] = [];

		const UIClass = this._parser.classFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomTSClass) {
			this._addLocationsFromUIClass(member, UIClass, locations);
			const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
				UIClass,
				[],
				true,
				true,
				true
			);
			const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
			viewAndFragmentArray.forEach(XMLDoc => {
				this._addLocationsFromXMLDocument(XMLDoc, member, locations);
			});
		}

		return locations;
	}

	private _addLocationsFromXMLDocument(
		XMLDoc: IXMLFile,
		member: ICustomClassTSMethod | ICustomClassTSField,
		locations: ILocation[]
	) {
		const cache = XMLDoc.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
		} else {
			const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(XMLDoc, member.name, member.owner);

			const currentLocations: ILocation[] = [];
			tagsAndAttributes.forEach(tagAndAttribute => {
				tagAndAttribute.attributes.forEach(attribute => {
					const positionBegin =
						tagAndAttribute.tag.positionBegin +
						tagAndAttribute.tag.text.indexOf(attribute) +
						attribute.indexOf(member.name);
					const positionEnd = positionBegin + member.name.length;
					const range = RangeAdapter.offsetsRange(XMLDoc.content, positionBegin, positionEnd);
					if (range) {
						currentLocations.push({ filePath: XMLDoc.fsPath, range: range });
					}
				});
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			if (!cache[member.owner]) {
				cache[member.owner] = {};
			}
			cache[member.owner][`_${member.name}`] = currentLocations;
			XMLDoc.setCache("referenceCodeLensCache", cache);
		}
	}

	private _addLocationsFromUIClass(
		member: ICustomClassTSMethod | ICustomClassTSField,
		UIClass: CustomTSClass,
		locations: ILocation[]
	) {
		const cache = UIClass.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
			return;
		}

		const references = member.tsNode.findReferences().flatMap(reference => reference.getReferences());
		const currentLocations: ILocation[] = references
			.filter(reference => {
				const notAReferenceToItself =
					reference.getSourceFile().getFilePath() !== UIClass.fsPath ||
					(!(member.tsNode instanceof ConstructorDeclaration) &&
						reference.getNode().getStart() !== member.tsNode.getNameNode().getStart()) ||
					(member.tsNode instanceof ConstructorDeclaration &&
						reference.getNode().getStart() !== member.tsNode.getStart());
				return notAReferenceToItself;
			})
			.map(reference => {
				const range = RangeAdapter.offsetsRange(
					reference.getSourceFile().getFullText(),
					reference.getTextSpan().getStart(),
					reference.getTextSpan().getEnd()
				);
				let referenceData: [IRange, string] | undefined;
				if (range) {
					referenceData = [range, reference.getSourceFile().getFilePath()];
				}
				return referenceData;
			})
			.filter(rangeData => !!rangeData)
			.map(rangeData => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return { filePath: rangeData![1] || "", range: rangeData![0] };
			});

		if (!cache[member.owner]) {
			cache[member.owner] = {};
		}
		cache[member.owner][`_${member.name}`] = currentLocations;
		UIClass.setCache("referenceCodeLensCache", cache);
		locations.push(...currentLocations);
	}
}
