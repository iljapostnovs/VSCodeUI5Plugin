import { XMLParser } from "ui5plugin-parser";
import { ICustomClassUIMethod, CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { VSCodeTextDocumentTransformer } from "../../../../utils/VSCodeTextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";

export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: vscode.Location[]
	};
}

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = VSCodeTextDocumentTransformer.toCustomUIClass(document);
			if (UIClass) {
				const methods = UIClass.methods;

				methods.forEach(method => {
					if (method.memberPropertyNode) {
						const locations = this.getReferenceLocations(method);
						const positionBegin = document.positionAt(method.memberPropertyNode.start);
						const positionEnd = document.positionAt(method.memberPropertyNode.end);
						const range = new vscode.Range(positionBegin, positionEnd);
						const codeLens = new vscode.CodeLens(range);
						codeLens.command = {
							title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
							command: locations.length ? "editor.action.showReferences" : "",
							arguments: [document.uri, range.start, locations]
						};
						codeLenses.push(codeLens);
					}
				});
			}
		}

		return codeLenses;
	}

	public getReferenceLocations(method: ICustomClassUIMethod) {
		const locations: vscode.Location[] = [];

		const UIClasses = UI5Plugin.getInstance().parser.classFactory.getAllCustomUIClasses();
		UIClasses.forEach(UIClass => {
			this._addLocationsFromUIClass(method, UIClass, locations);
		});

		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(method.owner);
		if (UIClass instanceof CustomUIClass) {
			const viewsAndFragments = UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, true, true);
			const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
			viewAndFragmentArray.forEach(XMLDoc => {
				this._addLocationsFromXMLDocument(XMLDoc, method, locations);
			});
		}

		return locations;
	}

	private _addLocationsFromXMLDocument(XMLDoc: IXMLFile, method: ICustomClassUIMethod, locations: vscode.Location[]) {
		// if (XMLDoc.referenceCodeLensCache[method.owner] && XMLDoc.referenceCodeLensCache[method.owner][method.name]) {
		// 	locations.push(...XMLDoc.referenceCodeLensCache[method.owner][method.name]);
		// } else {
		const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(XMLDoc, method.name, method.owner);

		const currentLocations: vscode.Location[] = [];
		tagsAndAttributes.forEach(tagAndAttribute => {
			tagAndAttribute.attributes.forEach(attribute => {
				const positionBegin = tagAndAttribute.tag.positionBegin + tagAndAttribute.tag.text.indexOf(attribute) + attribute.indexOf(method.name);
				const positionEnd = positionBegin + method.name.length;
				const range = RangeAdapter.offsetsToVSCodeRange(XMLDoc.content, positionBegin, positionEnd);
				if (range) {
					const uri = vscode.Uri.file(XMLDoc.fsPath);
					currentLocations.push(new vscode.Location(uri, range));
				}
			});
		});
		if (currentLocations.length > 0) {
			locations.push(...currentLocations);
		}
		// if (!XMLDoc.referenceCodeLensCache[method.owner]) {
		// 	XMLDoc.referenceCodeLensCache[method.owner] = {};
		// }
		// XMLDoc.referenceCodeLensCache[method.owner][method.name] = currentLocations;
		// }
	}

	private _addLocationsFromUIClass(method: ICustomClassUIMethod, UIClass: CustomUIClass, locations: vscode.Location[]) {
		// if (UIClass.referenceCodeLensCache[method.owner] && UIClass.referenceCodeLensCache[method.owner][`_${method.name}`]) {
		// 	locations.push(...UIClass.referenceCodeLensCache[method.owner][`_${method.name}`]);
		if (UIClass.classFSPath) {
			const regexp = new RegExp(`(?<=\\.)${method.name}(\\(|\\)|\\,|\\.|\\s)`, "g");
			const results: RegExpExecArray[] = [];
			let result = regexp.exec(UIClass.classText);
			while (result) {
				results.push(result);
				result = regexp.exec(UIClass.classText);
			}

			const currentLocations: vscode.Location[] = [];
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
			const uri = vscode.Uri.file(UIClass.classFSPath);
			results.forEach(result => {
				const calleeClassName = strategy.acornGetClassName(UIClass.className, result.index);
				const calleeUIClass = calleeClassName && UI5Plugin.getInstance().parser.classFactory.getUIClass(calleeClassName);
				if (
					calleeUIClass && calleeUIClass instanceof CustomUIClass &&
					calleeClassName &&
					(
						UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(calleeClassName, method.owner) ||
						(
							UIClass.className === calleeClassName &&
							UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(method.owner, calleeClassName) &&
							UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(method.owner, UIClass.className)
						)
					)
				) {
					const range = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, result.index, result.index + method.name.length);
					if (range) {
						currentLocations.push(new vscode.Location(uri, range));
					}
				}
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			// if (!UIClass.referenceCodeLensCache[method.owner]) {
			// 	UIClass.referenceCodeLensCache[method.owner] = {};
			// }
			// UIClass.referenceCodeLensCache[method.owner][`_${method.name}`] = currentLocations;
		}
	}
}