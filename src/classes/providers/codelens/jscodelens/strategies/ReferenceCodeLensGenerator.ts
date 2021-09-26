import * as vscode from "vscode";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { TextDocumentTransformer } from "../../../../utils/TextDocumentTransformer";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { XMLParser } from "../../../../utils/XMLParser";
import { IXMLFile } from "../../../../utils/FileReader";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";

export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: vscode.Location[]
	};
}

export class ReferenceCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];

		if (vscode.workspace.getConfiguration("ui5.plugin").get("jsReferenceCodeLens")) {
			const UIClass = TextDocumentTransformer.toCustomUIClass(document);
			if (UIClass) {
				const methods = UIClass.methods;

				methods.forEach(method => {
					if (method.memberPropertyNode) {
						const locations = this.getReferenceLocations(method);
						const range = RangeAdapter.acornLocationToVSCodeRange(method.memberPropertyNode.loc);
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

	public getReferenceLocations(member: ICustomClassUIMethod | ICustomClassUIField) {
		const locations: vscode.Location[] = [];

		const UIClasses = UIClassFactory.getAllCustomUIClasses();
		UIClasses.forEach(UIClass => {
			this._addLocationsFromUIClass(member, UIClass, locations);
		});

		const UIClass = UIClassFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomUIClass) {
			const viewsAndFragments = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, true, true);
			const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
			viewAndFragmentArray.forEach(XMLDoc => {
				this._addLocationsFromXMLDocument(XMLDoc, member, locations);
			});
		}

		return locations;
	}

	private _addLocationsFromXMLDocument(XMLDoc: IXMLFile, member: ICustomClassUIMethod | ICustomClassUIField, locations: vscode.Location[]) {
		if (XMLDoc.referenceCodeLensCache[member.owner] && XMLDoc.referenceCodeLensCache[member.owner][member.name]) {
			locations.push(...XMLDoc.referenceCodeLensCache[member.owner][member.name]);
		} else {
			const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(XMLDoc, member.name, member.owner);

			const currentLocations: vscode.Location[] = [];
			tagsAndAttributes.forEach(tagAndAttribute => {
				tagAndAttribute.attributes.forEach(attribute => {
					const positionBegin = tagAndAttribute.tag.positionBegin + tagAndAttribute.tag.text.indexOf(attribute) + attribute.indexOf(member.name);
					const positionEnd = positionBegin + member.name.length;
					const range = RangeAdapter.offsetsToVSCodeRange(XMLDoc.content, positionBegin, positionEnd - 1);
					if (range) {
						const uri = vscode.Uri.file(XMLDoc.fsPath);
						currentLocations.push(new vscode.Location(uri, range));
					}
				});
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			if (!XMLDoc.referenceCodeLensCache[member.owner]) {
				XMLDoc.referenceCodeLensCache[member.owner] = {};
			}
			XMLDoc.referenceCodeLensCache[member.owner][member.name] = currentLocations;
		}
	}

	private _addLocationsFromUIClass(member: ICustomClassUIMethod | ICustomClassUIField, UIClass: CustomUIClass, locations: vscode.Location[]) {
		if (UIClass.referenceCodeLensCache[member.owner] && UIClass.referenceCodeLensCache[member.owner][`_${member.name}`]) {
			locations.push(...UIClass.referenceCodeLensCache[member.owner][`_${member.name}`]);
		} else if (UIClass.classFSPath) {
			const results: RegExpExecArray[] = this._getCurrentMethodMentioning(member, UIClass);

			const currentLocations: vscode.Location[] = [];
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			const uri = vscode.Uri.file(UIClass.classFSPath);
			results.forEach(result => {
				const calleeClassName = strategy.acornGetClassName(UIClass.className, result.index);
				const calleeUIClass = calleeClassName && UIClassFactory.getUIClass(calleeClassName);
				if (
					calleeUIClass && calleeUIClass instanceof CustomUIClass &&
					(
						UIClassFactory.isClassAChildOfClassB(calleeClassName, member.owner) ||
						(
							UIClass.className === calleeClassName &&
							UIClassFactory.isClassAChildOfClassB(member.owner, calleeClassName) &&
							UIClassFactory.isClassAChildOfClassB(member.owner, UIClass.className)
						)
					)
				) {
					const range = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, result.index, result.index + member.name.length - 1);
					if (range) {
						currentLocations.push(new vscode.Location(uri, range));
					}
				}
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			if (!UIClass.referenceCodeLensCache[member.owner]) {
				UIClass.referenceCodeLensCache[member.owner] = {};
			}
			UIClass.referenceCodeLensCache[member.owner][`_${member.name}`] = currentLocations;
		}
	}

	private _getCurrentMethodMentioning(member: ICustomClassUIMethod | ICustomClassUIField, UIClass: CustomUIClass) {
		const regexp = new RegExp(`(?<=\\.)${member.name}(\\(|\\)|\\,|\\.|\\s)(?!=)`, "g");
		const results: RegExpExecArray[] = [];
		let result = regexp.exec(UIClass.classText);
		while (result) {
			results.push(result);
			result = regexp.exec(UIClass.classText);
		}
		return results;
	}
}