import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import { CustomDiagnostics } from "../../../registrators/DiagnosticsRegistrator";
import ParserBearer from "../../../ui5parser/ParserBearer";
import { SwitchToControllerCommand } from "../../../vscommands/switchers/SwitchToControllerCommand";
import { InsertType, MethodInserter } from "../util/MethodInserter";

export class XMLCodeActionProvider extends ParserBearer {
	async getCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = this._getEventAutofillCodeActions(document, range);

		return providerResult;
	}

	private _getEventAutofillCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection) {
		const providerResult: vscode.CodeAction[] = [];
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const diagnostic: CustomDiagnostics | undefined = diagnostics
			.filter(diagnostic => diagnostic instanceof CustomDiagnostics)
			.find(diagnostic => {
				return diagnostic.range.contains(range);
			});
		const XMLFile =
			diagnostic?.attribute && this._parser.textDocumentTransformer.toXMLFile(new TextDocumentAdapter(document));
		if (diagnostic?.attribute && XMLFile) {
			const currentPositionOffset = document?.offsetAt(range.end);
			const attributeData = this._parser.xmlParser.getAttributeNameAndValue(diagnostic.attribute);
			attributeData.attributeValue = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(
				attributeData.attributeValue
			);
			const tagText = this._parser.xmlParser.getTagInPosition(XMLFile, currentPositionOffset).text;
			const tagPrefix = this._parser.xmlParser.getTagPrefix(tagText);
			const classNameOfTheTag = this._parser.xmlParser.getClassNameFromTag(tagText);
			const libraryPath = this._parser.xmlParser.getLibraryPathFromTagPrefix(
				XMLFile,
				tagPrefix,
				currentPositionOffset
			);
			const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
			const events = this._parser.classFactory.getClassEvents(classOfTheTag);
			const event = events.find(event => event.name === attributeData.attributeName);
			if (event) {
				const controllerName = new SwitchToControllerCommand(this._parser).getResponsibleClassForCurrentView();
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

					const insertCodeAction = new MethodInserter(this._parser).createInsertMethodCodeAction(
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
