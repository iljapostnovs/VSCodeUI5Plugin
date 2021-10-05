import { XMLParser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { ITag } from "ui5plugin-parser/dist/classes/utils/XMLParser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../UI5Plugin";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
export class XMLDefinitionProvider {
	public static provideDefinitionsFor(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const offset = document.offsetAt(position);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);

		const XMLFile = TextDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (XMLFile) {
			const tag = XMLParser.getTagInPosition(XMLFile, offset);
			const attributes = XMLParser.getAttributesOfTheTag(tag);

			const attribute = attributes?.find(attribute => {
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				const eventHandlerName = XMLParser.getEventHandlerNameFromAttributeValue(attributeValue);

				return eventHandlerName === word;
			});
			if (attribute) {
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				const eventHandlerName = XMLParser.getEventHandlerNameFromAttributeValue(attributeValue);
				const responsibleClassName = UI5Plugin.getInstance().parser.fileReader.getResponsibleClassForXMLDocument(new TextDocumentAdapter(document));
				if (responsibleClassName) {
					location = this._getLocationFor(responsibleClassName, eventHandlerName);
				}
			}

			if (!location) {
				location = this._getLocationForFragmentOrViewPaths(tag, offset, document);
			}
		}

		return location;
	}

	private static _getLocationForFragmentOrViewPaths(tag: ITag, offset: number, document: vscode.TextDocument) {
		let location: vscode.LocationLink[] | undefined;
		const attributes = XMLParser.getAttributesOfTheTag(tag);
		if (attributes) {
			const attribute = attributes?.find(attribute => {
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				const attributeValueOffsetBegin = tag.positionBegin + tag.text.indexOf(attribute) + attribute.indexOf(attributeValue);
				const attributeValueOffsetEnd = attributeValueOffsetBegin + attributeValue.length;

				return attributeValueOffsetBegin <= offset && attributeValueOffsetEnd >= offset;
			});

			if (attribute) {
				const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
				const attributeValueOffsetBegin = tag.positionBegin + tag.text.indexOf(attribute) + attribute.indexOf(attributeValue);
				const attributeValueOffsetEnd = attributeValueOffsetBegin + attributeValue.length;
				const XMLFile = UI5Plugin.getInstance().parser.fileReader.getXMLFile(attributeValue);
				if (XMLFile) {
					const classUri = vscode.Uri.file(XMLFile.fsPath);
					const vscodePosition = new vscode.Position(0, 0);
					const originSelectionPositionBegin = document.positionAt(attributeValueOffsetBegin);
					const originSelectionPositionEnd = document.positionAt(attributeValueOffsetEnd);
					location = [{
						targetRange: new vscode.Range(vscodePosition, vscodePosition),
						targetUri: classUri,
						originSelectionRange: new vscode.Range(originSelectionPositionBegin, originSelectionPositionEnd)
					}];
				}
			}
		}

		return location;
	}

	private static _getLocationFor(jsUIClassName: string, eventHandlerName: string) {
		let location: vscode.Location | undefined;
		const responsibleClassName = this._findClassNameOfEventHandler(jsUIClassName, eventHandlerName)
		if (responsibleClassName) {
			const controllerUIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(responsibleClassName);
			if (controllerUIClass instanceof CustomUIClass) {
				const classPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(responsibleClassName);
				const method = controllerUIClass.methods.find(method => method.name === eventHandlerName);
				if (method?.position && classPath) {
					const classUri = vscode.Uri.file(classPath);
					const position = PositionAdapter.acornPositionToVSCodePosition(method.memberPropertyNode.loc.start);
					if (position) {
						location = new vscode.Location(classUri, position);
					}
				}
			}
		}

		return location;
	}

	private static _findClassNameOfEventHandler(className: string, methodName: string): string | undefined {
		const UIClass = <CustomUIClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		const method = UIClass.methods.find(method => method.name === methodName);
		if (method) {
			return className;
		} else if (UIClass.parentClassNameDotNotation) {
			return this._findClassNameOfEventHandler(UIClass.parentClassNameDotNotation, methodName);
		}
	}
}