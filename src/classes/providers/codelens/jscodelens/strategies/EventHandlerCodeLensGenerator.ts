import * as vscode from "vscode";
import { CustomClassUIMethod, CustomUIClass } from "../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../UI5Classes/UIClassFactory";
import { FileReader, Fragment, View } from "../../../../utils/FileReader";
import { XMLParser } from "../../../../utils/XMLParser";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
import LineColumn = require("line-column");
import { AcornSyntaxAnalyzer } from "../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";

interface EventHandlerData {
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

		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			const eventHandlers = UIClass.methods.filter(method => method.isEventHandler);
			const XMLView = FileReader.getViewForController(className);
			const fragments = FileReader.getFragmentsForClass(className);
			if (XMLView) {
				codeLenses.push(...this._getCodeLensesForEventsFromXMLText(XMLView, eventHandlers, document));

				XMLView.fragments.forEach(fragment => {
					codeLenses.push(...this._getCodeLensesForEventsFromXMLText(fragment, eventHandlers, document));
				});

			}
			fragments.forEach(fragment => {
				codeLenses.push(...this._getCodeLensesForEventsFromXMLText(fragment, eventHandlers, document));
			});

			codeLenses.push(...this._getCodeLensesForEventsFromJSClass(eventHandlers, document));
		}

		return codeLenses;
	}

	private _getCodeLensesForEventsFromXMLText(XMLText: View | Fragment, eventHandlers: CustomClassUIMethod[], document: vscode.TextDocument) {
		const codeLenses: vscode.CodeLens[] = [];
		const solvedEventHandlers: CustomClassUIMethod[] = [];
		XMLParser.setCurrentDocument(XMLText.content);
		eventHandlers.forEach(eventHandler => {
			const eventHandlerXMLData = this._getEventHandlerData(XMLText.content, eventHandler.name);
			if (eventHandlerXMLData && eventHandler.position) {
				const positionBegin = document.positionAt(eventHandler.position);
				const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const positionInViewStart = LineColumn(XMLText.content).fromIndex(eventHandlerXMLData.start);
				const positionInViewEnd = LineColumn(XMLText.content).fromIndex(eventHandlerXMLData.end);

				if (positionInViewStart && positionInViewEnd) {
					const classUri = vscode.Uri.file(XMLText.fsPath);
					const controlIdText = eventHandlerXMLData.controlId ? ` (${eventHandlerXMLData.controlId})` : "";
					const description = `Event handler of "${eventHandlerXMLData.className}${controlIdText}~${eventHandlerXMLData.name}"`;
					const codeLens = new vscode.CodeLens(range, {
						tooltip: description,
						title: description,
						command: "vscode.open",
						arguments: [classUri, {
							selection: new vscode.Range(
								positionInViewStart.line - 1, positionInViewStart.col - 1,
								positionInViewEnd.line - 1, positionInViewEnd.col,
							)
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

	private _getEventHandlerData(XMLText: string, eventHandlerName: string) {
		let eventHandlerData: EventHandlerData | undefined;

		const regex = new RegExp(`".?${eventHandlerName}"`);
		const eventHandlerPosition = regex.exec(XMLText)?.index;
		if (eventHandlerPosition) {
			const tag = XMLParser.getTagInPosition(XMLText, eventHandlerPosition);
			const attributes = XMLParser.getAttributesOfTheTag(tag);
			const attribute = attributes?.find(attribute => {
				return XMLParser.getAttributeNameAndValue(attribute).attributeValue.replace(".", "") === eventHandlerName;
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

	private _getCodeLensesForEventsFromJSClass(eventHandlers: CustomClassUIMethod[], document: vscode.TextDocument) {
		const solvedEventHandlers: CustomClassUIMethod[] = [];
		const codeLenses: vscode.CodeLens[] = [];
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			eventHandlers.forEach(eventHandler => {
				const eventData = AcornSyntaxAnalyzer.getEventHandlerDataFromJSClass(className, eventHandler.name);
				if (eventData && eventHandler.position) {
					const positionBegin = document.positionAt(eventHandler.position);
					const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
					const range = new vscode.Range(positionBegin, positionEnd);
					const positionInViewStart = LineColumn(UIClass.classText).fromIndex(eventData.node.start);
					const positionInViewEnd = LineColumn(UIClass.classText).fromIndex(eventData.node.end);

					if (positionInViewStart && positionInViewEnd) {
						const classUri = document.uri;
						const description = `Event handler of "${eventData.className}~${eventData.eventName}"`;
						const codeLens = new vscode.CodeLens(range, {
							tooltip: description,
							title: description,
							command: "vscode.open",
							arguments: [classUri, {
								selection: new vscode.Range(
									positionInViewStart.line - 1, positionInViewStart.col - 1,
									positionInViewEnd.line - 1, positionInViewEnd.col - 1,
								)
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