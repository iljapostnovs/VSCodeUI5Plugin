import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FileReader, XMLFileTransformer } from "../../../utils/FileReader";
import LineColumn = require("line-column");
import { XMLParser } from "../../../utils/XMLParser";
import { ITag } from "../../diagnostics/xml/xmllinter/parts/abstraction/Linter";
export class XMLDefinitionProvider {
	public static provideDefinitionsFor(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const offset = document.offsetAt(position);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);

		const XMLFile = XMLFileTransformer.transformFromVSCodeDocument(document);
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
				const responsibleClassName = FileReader.getResponsibleClassForXMLDocument(document);
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
				const XMLFile = FileReader.getXMLFile(attributeValue);
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
			const controllerUIClass = UIClassFactory.getUIClass(responsibleClassName);
			if (controllerUIClass instanceof CustomUIClass) {
				const classPath = FileReader.getClassPathFromClassName(responsibleClassName);
				const method = controllerUIClass.methods.find(method => method.name === eventHandlerName);
				if (method?.position && classPath) {
					const classUri = vscode.Uri.file(classPath);
					const methodPosition = LineColumn(controllerUIClass.classText).fromIndex(method.position);
					if (methodPosition) {
						const vscodePosition = new vscode.Position(methodPosition.line - 1, methodPosition.col - 1);
						location = new vscode.Location(classUri, vscodePosition);
					}
				}
			}
		}

		return location;
	}

	private static _findClassNameOfEventHandler(className: string, methodName: string): string | undefined {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const method = UIClass.methods.find(method => method.name === methodName);
		if (method) {
			return className;
		} else if (UIClass.parentClassNameDotNotation) {
			return this._findClassNameOfEventHandler(UIClass.parentClassNameDotNotation, methodName);
		}
	}
}