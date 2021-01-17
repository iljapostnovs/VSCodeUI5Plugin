import * as vscode from "vscode";
import { XMLParser } from "../../../utils/XMLParser";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { SwitchToControllerCommand } from "../../../vscommands/switchers/SwitchToControllerCommand";
import { MethodInserter } from "../util/MethodInserter";

export class XMLCodeActionProvider {
	static async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = this._getEventAutofillCodeActions(document, range);

		return providerResult;
	}

	private static _getEventAutofillCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = [];
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const diagnostic = diagnostics.find(diagnostic => {
			return diagnostic.range.contains(range);
		});
		if (diagnostic?.source) {
			const currentPositionOffset = document?.offsetAt(range.end);
			const attributeData = XMLParser.getAttributeNameAndValue(diagnostic.source);
			if (attributeData.attributeValue.startsWith(".")) {
				attributeData.attributeValue = attributeData.attributeValue.replace(".", "");
			}
			const tagText = XMLParser.getTagInPosition(document.getText(), currentPositionOffset);
			const tagPrefix = XMLParser.getTagPrefix(tagText);
			const classNameOfTheTag = XMLParser.getClassNameFromTag(tagText);
			const libraryPath = XMLParser.getLibraryPathFromTagPrefix(document.getText(), tagPrefix, currentPositionOffset);
			const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
			const events = UIClassFactory.getClassEvents(classOfTheTag);
			const event = events.find(event => event.name === attributeData.attributeName);
			if (event) {
				const controllerName = SwitchToControllerCommand.getControllerNameOfCurrentView();
				if (controllerName) {
					const insertCodeAction = MethodInserter.createInsertMethodCodeAction(controllerName, attributeData.attributeValue, `function(oEvent) {\n\t\t\t\n\t\t}`, true);
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
