import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FileReader } from "../../../utils/FileReader";
import LineColumn = require("line-column");
import { XMLParser } from "../../../utils/XMLParser";
export class XMLDefinitionProvider {
	public static provideDefinitionsFor(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
		let location: vscode.Location | undefined;
		const XMLText = document.getText();
		const offset = document.offsetAt(position);
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);

		XMLParser.setCurrentDocument(XMLText);
		const tag = XMLParser.getTagInPosition(XMLText, offset);
		const attributes = XMLParser.getAttributesOfTheTag(tag);

		const attribute = attributes?.find(attribute => XMLParser.getAttributeNameAndValue(attribute).attributeValue.replace(".", "") === word);
		if (attribute) {
			const { attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
			const responsibleClassName = FileReader.getResponsibleClassForXMLDocument(document);
			if (responsibleClassName) {
				location = this._getLocationFor(responsibleClassName, attributeValue);
			}
		}
		XMLParser.setCurrentDocument(undefined);

		return location;
	}

	private static _getLocationFor(jsUIClassName: string, eventHandlerName: string) {
		let location: vscode.Location | undefined;
		const responsibleClassName = this._findClassNameOfEventHandler(jsUIClassName, eventHandlerName)
		if (responsibleClassName) {
			const controllerUIClass = UIClassFactory.getUIClass(responsibleClassName);
			if (controllerUIClass instanceof CustomUIClass) {
				const classPath = FileReader.getClassPathFromClassName(responsibleClassName);
				const method = controllerUIClass.methods.find(method => method.name === eventHandlerName.replace(".", ""));
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
		const method = UIClass.methods.find(method => method.name === methodName.replace(".", ""));
		if (method) {
			return className;
		} else if (UIClass.parentClassNameDotNotation) {
			return this._findClassNameOfEventHandler(UIClass.parentClassNameDotNotation, methodName);
		}
	}
}