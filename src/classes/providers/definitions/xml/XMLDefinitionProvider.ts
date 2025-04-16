import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import * as vscode from "vscode";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";
export class XMLDefinitionProvider extends ParserBearer {
	public provideDefinitionsFor(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const offset = document.offsetAt(position);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (XMLFile) {
			const tag = this._parser.xmlParser.getTagInPosition(XMLFile, offset);
			const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);

			const attribute = attributes?.find(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const eventHandlerName = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(attributeValue);
				const eventHandlerNameNoDot = eventHandlerName.startsWith(".") ? eventHandlerName.replace(".", "") : eventHandlerName;

				return eventHandlerNameNoDot === word || `cmd:${eventHandlerName}` === word;
			});
			if (attribute) {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const eventHandlerName = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(attributeValue);
				const eventHandlerNameNoDot = eventHandlerName.startsWith(".") ? eventHandlerName.replace(".", "") : eventHandlerName;
				const responsibleClassName = this._parser.fileReader.getResponsibleClassForXMLDocument(
					new TextDocumentAdapter(document)
				);
				if (responsibleClassName) {
					location = this._getLocationFor(responsibleClassName, eventHandlerNameNoDot);
				}
			}

			if (!location) {
				location = this._getLocationForFragmentOrViewPaths(tag, offset, document);
			}
		}

		return location;
	}

	private _getLocationForFragmentOrViewPaths(tag: ITag, offset: number, document: vscode.TextDocument) {
		let location: vscode.LocationLink[] | undefined;
		const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
		if (attributes) {
			const attribute = attributes?.find(attribute => {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const attributeValueOffsetBegin =
					tag.positionBegin + tag.text.indexOf(attribute) + attribute.indexOf(attributeValue);
				const attributeValueOffsetEnd = attributeValueOffsetBegin + attributeValue.length;

				return attributeValueOffsetBegin <= offset && attributeValueOffsetEnd >= offset;
			});

			if (attribute) {
				const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
				const attributeValueOffsetBegin =
					tag.positionBegin + tag.text.indexOf(attribute) + attribute.indexOf(attributeValue);
				const attributeValueOffsetEnd = attributeValueOffsetBegin + attributeValue.length;
				const XMLFile = this._parser.fileReader.getXMLFile(attributeValue);
				if (XMLFile) {
					const classUri = vscode.Uri.file(XMLFile.fsPath);
					const vscodePosition = new vscode.Position(0, 0);
					const originSelectionPositionBegin = document.positionAt(attributeValueOffsetBegin);
					const originSelectionPositionEnd = document.positionAt(attributeValueOffsetEnd);
					location = [
						{
							targetRange: new vscode.Range(vscodePosition, vscodePosition),
							targetUri: classUri,
							originSelectionRange: new vscode.Range(
								originSelectionPositionBegin,
								originSelectionPositionEnd
							)
						}
					];
				}
			}
		}

		return location;
	}

	private _getLocationFor(jsUIClassName: string, eventHandlerName: string) {
		let location: vscode.Location | undefined;
		const responsibleClassName = this._findClassNameOfEventHandler(jsUIClassName, eventHandlerName);
		if (responsibleClassName) {
			const controllerUIClass = this._parser.classFactory.getUIClass(responsibleClassName);
			if (controllerUIClass instanceof AbstractCustomClass) {
				const classPath = this._parser.fileReader.getClassFSPathFromClassName(responsibleClassName);
				const method = controllerUIClass.methods.find(method => method.name === eventHandlerName);
				if (method?.position && classPath && method.loc) {
					const classUri = vscode.Uri.file(classPath);
					const position = PositionAdapter.acornPositionToVSCodePosition(method.loc?.start);
					if (position) {
						location = new vscode.Location(classUri, position);
					}
				}
			}
		}

		return location;
	}

	private _findClassNameOfEventHandler(className: string, methodName: string): string | undefined {
		const UIClass = <AbstractCustomClass>this._parser.classFactory.getUIClass(className);
		const method = UIClass.methods.find(method => method.name === methodName);
		if (method) {
			return className;
		} else if (UIClass.parentClassNameDotNotation) {
			return this._findClassNameOfEventHandler(UIClass.parentClassNameDotNotation, methodName);
		}
	}
}
