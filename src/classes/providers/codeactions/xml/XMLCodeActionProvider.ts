import * as vscode from "vscode";
import { XMLParser } from "../../../utils/XMLParser";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { SwitchToControllerCommand } from "../../../vscommands/switchers/SwitchToControllerCommand";
import { MethodInserter } from "../util/MethodInserter";
import { CustomDiagnostics } from "../../../registrators/DiagnosticsRegistrator";
import { XMLFileTransformer } from "../../../utils/FileReader";

export class XMLCodeActionProvider {
	static async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = this._getEventAutofillCodeActions(document, range);

		return providerResult;
	}

	private static _getEventAutofillCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = [];
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const diagnostic: CustomDiagnostics | undefined = diagnostics.filter(diagnostic => diagnostic instanceof CustomDiagnostics).find(diagnostic => {
			return diagnostic.range.contains(range);
		});
		const XMLFile = diagnostic?.attribute && XMLFileTransformer.transformFromVSCodeDocument(document);
		if (diagnostic?.attribute && XMLFile) {
			const currentPositionOffset = document?.offsetAt(range.end);
			const attributeData = XMLParser.getAttributeNameAndValue(diagnostic.attribute);
			attributeData.attributeValue = XMLParser.getEventHandlerNameFromAttributeValue(attributeData.attributeValue);
			const tagText = XMLParser.getTagInPosition(XMLFile, currentPositionOffset).text;
			const tagPrefix = XMLParser.getTagPrefix(tagText);
			const classNameOfTheTag = XMLParser.getClassNameFromTag(tagText);
			const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPositionOffset);
			const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
			const events = UIClassFactory.getClassEvents(classOfTheTag);
			const event = events.find(event => event.name === attributeData.attributeName);
			if (event) {
				const controllerName = SwitchToControllerCommand.getResponsibleClassForCurrentView();
				if (controllerName) {
					const insertCodeAction = MethodInserter.createInsertMethodCodeAction(controllerName, attributeData.attributeValue, "function(oEvent) {\n\t\t\t\n\t\t}");
					if (insertCodeAction) {
						insertCodeAction.diagnostics = [diagnostic];

						providerResult.push(insertCodeAction);
					}
				}
			}
		}

		return providerResult;
	}

}
