import * as vscode from "vscode";
import { SwitchToControllerCommand } from "../../../vscommands/switchers/SwitchToControllerCommand";
import { InsertType, MethodInserter } from "../util/MethodInserter";
import { CustomDiagnostics } from "../../../registrators/DiagnosticsRegistrator";
import { XMLParser } from "ui5plugin-parser";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { UI5Plugin } from "../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";

export class XMLCodeActionProvider {
	static async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = this._getEventAutofillCodeActions(document, range);

		return providerResult;
	}

	private static _getEventAutofillCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = [];
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const diagnostic: CustomDiagnostics | undefined = diagnostics
			.filter(diagnostic => diagnostic instanceof CustomDiagnostics)
			.find(diagnostic => {
				return diagnostic.range.contains(range);
			});
		const XMLFile = diagnostic?.attribute && TextDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (diagnostic?.attribute && XMLFile) {
			const currentPositionOffset = document?.offsetAt(range.end);
			const attributeData = XMLParser.getAttributeNameAndValue(diagnostic.attribute);
			attributeData.attributeValue = XMLParser.getEventHandlerNameFromAttributeValue(
				attributeData.attributeValue
			);
			const tagText = XMLParser.getTagInPosition(XMLFile, currentPositionOffset).text;
			const tagPrefix = XMLParser.getTagPrefix(tagText);
			const classNameOfTheTag = XMLParser.getClassNameFromTag(tagText);
			const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPositionOffset);
			const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
			const events = UI5Plugin.getInstance().parser.classFactory.getClassEvents(classOfTheTag);
			const event = events.find(event => event.name === attributeData.attributeName);
			if (event) {
				const controllerName = SwitchToControllerCommand.getResponsibleClassForCurrentView();
				if (controllerName) {
					// TODO: this
					const eventModule =
						(vscode.workspace.getConfiguration("ui5.plugin").get("tsEventModule") as string) ??
						"sap/ui/base/Event";

					const eventName = eventModule.split("/").pop() ?? "Event";

					const eventType =
						(vscode.workspace.getConfiguration("ui5.plugin").get("tsEventType") as string) ?? "Event";
					const eventTypeWithReplacedVars = eventType
						.replace("{classModule}", classOfTheTag.replace(/\./g, "/"))
						.replace("{className}", classOfTheTag)
						.replace("{eventName}", attributeData.attributeName);

					const insertCodeAction = MethodInserter.createInsertMethodCodeAction(
						controllerName,
						attributeData.attributeValue,
						"oEvent",
						"",
						InsertType.Method,
						eventName,
						eventModule,
						eventTypeWithReplacedVars
					);
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
