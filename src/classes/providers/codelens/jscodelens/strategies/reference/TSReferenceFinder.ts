import { RangeAdapter } from "ui5plugin-linter";
import { IRange } from "ui5plugin-linter/dist/classes/Linter";
import { XMLParser } from "ui5plugin-parser";
import {
	ICustomClassUIMethod,
	ICustomClassUIField
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { CustomTSClass } from "../../../../../../typescript/parsing/classes/CustomTSClass";
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
	public getReferenceLocations(member: ICustomClassUIMethod | ICustomClassUIField) {
		const locations: ILocation[] = [];

		// const UIClasses = this._parser.classFactory.getAllCustomUIClasses();
		// UIClasses.forEach(UIClass => {
		// 	this._addLocationsFromUIClass(member, UIClass, locations);
		// });

		const UIClass = this._parser.classFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomTSClass) {
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
		member: ICustomClassUIMethod | ICustomClassUIField,
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

	// private _addLocationsFromUIClass(member: ICustomClassUIMethod | ICustomClassUIField, UIClass: CustomTSClass, locations: ILocation[]) {
	// const cache = UIClass.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
	// if (cache[member.owner]?.[`_${member.name}`]) {
	// 	locations.push(...cache[member.owner][`_${member.name}`]);
	// } else if (UIClass.classFSPath) {
	// 	const results: RegExpExecArray[] = this._getCurrentMethodMentioning(member, UIClass);

	// 	const currentLocations: ILocation[] = [];
	// 	const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser);
	// 	results.forEach(result => {
	// 		const calleeClassName = strategy.acornGetClassName(UIClass.className, result.index);
	// 		const calleeUIClass = calleeClassName && this._parser.classFactory.getUIClass(calleeClassName);
	// 		if (
	// 			calleeUIClass && calleeUIClass instanceof CustomUIClass &&
	// 			calleeClassName &&
	// 			(
	// 				this._parser.classFactory.isClassAChildOfClassB(calleeClassName, member.owner) ||
	// 				(
	// 					UIClass.className === calleeClassName &&
	// 					this._parser.classFactory.isClassAChildOfClassB(member.owner, calleeClassName) &&
	// 					this._parser.classFactory.isClassAChildOfClassB(member.owner, UIClass.className)
	// 				)
	// 			)
	// 		) {
	// 			const range = RangeAdapter.offsetsRange(UIClass.classText, result.index, result.index + member.name.length);
	// 			if (range) {
	// 				currentLocations.push({ filePath: UIClass.classFSPath || "", range: range });
	// 			}
	// 		}
	// 	});
	// 	if (currentLocations.length > 0) {
	// 		locations.push(...currentLocations);
	// 	}
	// 	if (!cache[member.owner]) {
	// 		cache[member.owner] = {};
	// 	}
	// 	cache[member.owner][`_${member.name}`] = currentLocations;
	// 	UIClass.setCache("referenceCodeLensCache", cache);
	// }
	// }

	// private _getCurrentMethodMentioning(member: ICustomClassUIMethod | ICustomClassUIField, UIClass: CustomTSClass) {
	// 	const regexp = new RegExp(`(?<=\\.)${member.name}(\\(|\\)|\\,|\\.|\\s|;|\\[|\\])(?!=)`, "g");
	// 	const results: RegExpExecArray[] = [];
	// 	let result = regexp.exec(UIClass.classText);
	// 	while (result) {
	// 		results.push(result);
	// 		result = regexp.exec(UIClass.classText);
	// 	}
	// 	return results;
	// }
}
