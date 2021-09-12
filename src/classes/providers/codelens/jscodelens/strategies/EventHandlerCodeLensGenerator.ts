import * as vscode from "vscode";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { XMLParser } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { UI5Plugin } from "../../../../../UI5Plugin";

interface IEventHandlerData {
	name: string;
	className: string;
	start: number;
	end: number;
	controlId: string | undefined;
}
export class EventHandlerCodeLensGenerator extends CodeLensGenerator {
	getCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses = this._generateEventHandlerCodeLenses(document);

		return codeLenses;
	}

	private _generateEventHandlerCodeLenses(document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];

		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			const eventHandlers = UIClass.methods.filter(method => method.isEventHandler);
			const viewsAndFragments = UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass, [], true, true, true);
			const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
			XMLDocuments.forEach(XMLDocument => {
				codeLenses.push(...this._getCodeLensesForEventsFromXMLText(XMLDocument, eventHandlers, document));
			});

			codeLenses.push(...this._getCodeLensesForEventsFromJSClass(eventHandlers, document));
		}

		return codeLenses;
	}

	private _getCodeLensesForEventsFromXMLText(XMLText: IXMLFile, eventHandlers: ICustomClassUIMethod[], document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];
		const solvedEventHandlers: ICustomClassUIMethod[] = [];
		eventHandlers.forEach(eventHandler => {
			const eventHandlerXMLData = this._getEventHandlerData(XMLText, eventHandler.name);
			if (eventHandlerXMLData && eventHandler.position) {
				const positionBegin = document.positionAt(eventHandler.position);
				const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const rangeInView = RangeAdapter.offsetsToVSCodeRange(XMLText.content, eventHandlerXMLData.start, eventHandlerXMLData.end);

				if (rangeInView) {
					const classUri = vscode.Uri.file(XMLText.fsPath);
					const controlIdText = eventHandlerXMLData.controlId ? ` (${eventHandlerXMLData.controlId})` : "";
					const description = `Event handler of "${eventHandlerXMLData.className}${controlIdText}~${eventHandlerXMLData.name}"`;
					const codeLens = new vscode.CodeLens(range, {
						tooltip: description,
						title: description,
						command: "vscode.open",
						arguments: [classUri, {
							selection: rangeInView
						}]
					});
					codeLenses.push(codeLens);
					solvedEventHandlers.push(eventHandler);
				}
			}
		});
		solvedEventHandlers.forEach(solvedEventHandler => {
			eventHandlers.splice(eventHandlers.indexOf(solvedEventHandler), 1);
		});

		return codeLenses;
	}

	private _getEventHandlerData(XMLText: IXMLFile, eventHandlerName: string) {
		let eventHandlerData: IEventHandlerData | undefined;

		const regex = new RegExp(`".?${eventHandlerName}"`);
		const eventHandlerPosition = regex.exec(XMLText.content)?.index;
		if (eventHandlerPosition) {
			const tag = XMLParser.getTagInPosition(XMLText, eventHandlerPosition);
			const attributes = XMLParser.getAttributesOfTheTag(tag);
			const attribute = attributes?.find(attribute => {
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				return XMLParser.getEventHandlerNameFromAttributeValue(attributeValue) === eventHandlerName;
			});
			const idAttribute = attributes?.find(attribute => {
				return XMLParser.getAttributeNameAndValue(attribute).attributeName === "id";
			});

			let controlId;
			if (idAttribute) {
				controlId = XMLParser.getAttributeNameAndValue(idAttribute).attributeValue;
			}

			if (attribute) {
				const attributePositionStart = tag.positionBegin + tag.text.indexOf(attribute);
				eventHandlerData = {
					className: XMLParser.getClassNameInPosition(XMLText, eventHandlerPosition),
					name: XMLParser.getAttributeNameAndValue(attribute).attributeName,
					start: attributePositionStart,
					end: attributePositionStart + attribute.length,
					controlId: controlId
				};
			}

		}

		return eventHandlerData;
	}

	private _getCodeLensesForEventsFromJSClass(eventHandlers: ICustomClassUIMethod[], document: vscode.TextDocument) {
		const solvedEventHandlers: ICustomClassUIMethod[] = [];
		const codeLenses: vscode.CodeLens[] = [];
		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			eventHandlers.forEach(eventHandler => {
				const eventData = UI5Plugin.getInstance().parser.syntaxAnalyser.getEventHandlerDataFromJSClass(className, eventHandler.name);
				if (eventData && eventHandler.position) {
					const positionBegin = document.positionAt(eventHandler.position);
					const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
					const range = new vscode.Range(positionBegin, positionEnd);
					const rangeInView = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, eventData.node.start, eventData.node.end);

					if (rangeInView) {
						const classUri = document.uri;
						const description = `Event handler of "${eventData.className}~${eventData.eventName}"`;
						const codeLens = new vscode.CodeLens(range, {
							tooltip: description,
							title: description,
							command: "vscode.open",
							arguments: [classUri, {
								selection: rangeInView
							}]
						});
						codeLenses.push(codeLens);
						solvedEventHandlers.push(eventHandler);
					}
				}
			});
		}

		solvedEventHandlers.forEach(solvedEventHandler => {
			eventHandlers.splice(eventHandlers.indexOf(solvedEventHandler), 1);
		});

		return codeLenses;
	}
}