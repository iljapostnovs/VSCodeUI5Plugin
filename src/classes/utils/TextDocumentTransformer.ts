import { FileReader } from "./FileReader";
import { XMLParser } from "./XMLParser";
import * as vscode from "vscode";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";

export class TextDocumentTransformer {
	static toXMLFile(document: vscode.TextDocument, forceRefresh = false) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const xmlType = document.fileName.endsWith(".fragment.xml") ? "fragment" : "view";
			const XMLFile = FileReader.getXMLFile(className, xmlType);
			if (XMLFile && !XMLFile.XMLParserData) {
				const stringData = XMLParser.getStringPositionMapping(document.getText());
				XMLFile.XMLParserData = {
					tags: [],
					strings: stringData.positionMapping,
					prefixResults: {},
					areAllStringsClosed: stringData.areAllStringsClosed
				};
			}
			if (XMLFile && (XMLFile.content.length !== document.getText().length || forceRefresh)) {
				if (xmlType === "view") {
					FileReader.setNewViewContentToCache(document.getText(), document.fileName);
				} else if (xmlType === "fragment") {
					FileReader.setNewFragmentContentToCache(document.getText(), document.fileName);
				}
			}

			return XMLFile;
		}
	}

	static toUIClass(document: vscode.TextDocument) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		return className ? UIClassFactory.getUIClass(className) : undefined;
	}

	static toCustomUIClass(document: vscode.TextDocument) {
		let customUIClass: CustomUIClass | undefined;
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				customUIClass = UIClass;
			}
		}
		return customUIClass;
	}
}