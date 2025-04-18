import { UI5JSParser } from "ui5plugin-parser";
import {
	AbstractCustomClass,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import * as vscode from "vscode";
import { RangeAdapter } from "../../../../adapters/vscode/RangeAdapter";
import { CodeLensGenerator } from "./abstraction/CodeLensGenerator";
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

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				const eventHandlers = UIClass.methods.filter(method => method.isEventHandler);
				const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
					UIClass,
					[],
					true,
					true,
					true
				);
				const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
				XMLDocuments.forEach(XMLDocument => {
					codeLenses.push(...this._getCodeLensesForEventsFromXMLText(XMLDocument, eventHandlers, document));
				});

				codeLenses.push(...this._getCodeLensesForEventsFromJSClass(eventHandlers, document));
			}
		}

		return codeLenses;
	}

	private _getCodeLensesForEventsFromXMLText(
		XMLText: IXMLFile,
		eventHandlers: ICustomClassMethod[],
		document: vscode.TextDocument
	) {
		const codeLenses: vscode.CodeLens[] = [];
		const solvedEventHandlers: ICustomClassMethod[] = [];
		eventHandlers.forEach(eventHandler => {
			const eventHandlerXMLData = this._getEventHandlerData(XMLText, eventHandler.name);
			if (eventHandlerXMLData && eventHandler.position) {
				const positionBegin = document.positionAt(eventHandler.position);
				const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
				const range = new vscode.Range(positionBegin, positionEnd);
				const rangeInView = RangeAdapter.offsetsToVSCodeRange(
					XMLText.content,
					eventHandlerXMLData.start,
					eventHandlerXMLData.end
				);

				if (rangeInView) {
					const classUri = vscode.Uri.file(XMLText.fsPath);
					const controlIdText = eventHandlerXMLData.controlId ? ` (${eventHandlerXMLData.controlId})` : "";
					const description = `Event handler of "${eventHandlerXMLData.className}${controlIdText}~${eventHandlerXMLData.name}"`;
					const codeLens = new vscode.CodeLens(range, {
						tooltip: description,
						title: description,
						command: "vscode.open",
						arguments: [
							classUri,
							{
								selection: rangeInView
							}
						]
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
			const tag = this._parser.xmlParser.getTagInPosition(XMLText, eventHandlerPosition);
			const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
			const attribute = attributes?.find(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const currentEventHandlerName = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(attributeValue);
				const currentEventHandlerNameNoDot = currentEventHandlerName.startsWith(".") ? currentEventHandlerName.replace(".", "") : currentEventHandlerName;
				return (
					currentEventHandlerNameNoDot === eventHandlerName
				);
			});
			const idAttribute = attributes?.find(attribute => {
				return this._parser.xmlParser.getAttributeNameAndValue(attribute).attributeName === "id";
			});

			let controlId;
			if (idAttribute) {
				controlId = this._parser.xmlParser.getAttributeNameAndValue(idAttribute).attributeValue;
			}

			if (attribute) {
				const attributePositionStart = tag.positionBegin + tag.text.indexOf(attribute);
				eventHandlerData = {
					className: this._parser.xmlParser.getClassNameInPosition(XMLText, eventHandlerPosition),
					name: this._parser.xmlParser.getAttributeNameAndValue(attribute).attributeName,
					start: attributePositionStart,
					end: attributePositionStart + attribute.length,
					controlId: controlId
				};
			}
		}

		return eventHandlerData;
	}

	private _getCodeLensesForEventsFromJSClass(eventHandlers: ICustomClassMethod[], document: vscode.TextDocument) {
		const solvedEventHandlers: ICustomClassMethod[] = [];
		const codeLenses: vscode.CodeLens[] = [];
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass) {
				eventHandlers.forEach(eventHandler => {
					const eventData = (<UI5JSParser>this._parser).syntaxAnalyser.getEventHandlerDataFromJSClass(
						className,
						eventHandler.name
					);
					if (eventData && eventHandler.position) {
						const positionBegin = document.positionAt(eventHandler.position);
						const positionEnd = document.positionAt(eventHandler.position + eventHandler.name.length);
						const range = new vscode.Range(positionBegin, positionEnd);
						const rangeInView = RangeAdapter.offsetsToVSCodeRange(
							UIClass.classText,
							eventData.node.start,
							eventData.node.end - 1
						);

						if (rangeInView) {
							const classUri = document.uri;
							const description = `Event handler of "${eventData.className}~${eventData.eventName}"`;
							const codeLens = new vscode.CodeLens(range, {
								tooltip: description,
								title: description,
								command: "vscode.open",
								arguments: [
									classUri,
									{
										selection: rangeInView
									}
								]
							});
							codeLenses.push(codeLens);
							solvedEventHandlers.push(eventHandler);
						}
					}
				});
			}
		}

		solvedEventHandlers.forEach(solvedEventHandler => {
			eventHandlers.splice(eventHandlers.indexOf(solvedEventHandler), 1);
		});

		return codeLenses;
	}
}
