import * as vscode from "vscode";
import { XMLParser } from "../utils/XMLParser";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";
import { SwitchToControllerCommand } from "../vscommands/switchers/SwitchToControllerCommand";
import { FileReader } from "../utils/FileReader";
import { CustomUIClass } from "../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import LineColumn = require("line-column");

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
					const controllerPath = FileReader.convertClassNameToFSPath(controllerName, true);
					if (controllerPath) {
						const controllerUri = vscode.Uri.file(controllerPath);
						const UIClass = <CustomUIClass>UIClassFactory.getUIClass(controllerName);
						const lastMethod = UIClass.acornClassBody.properties[UIClass.acornClassBody.properties.length - 1];
						if (lastMethod) {
							const offset = lastMethod.end;
							const lineColumn = LineColumn(UIClass.classText).fromIndex(offset);

							if (lineColumn) {
								const UIDefineCodeAction = new vscode.CodeAction(`Create ${attributeData.attributeValue} event handler in controller`, vscode.CodeActionKind.QuickFix);
								UIDefineCodeAction.isPreferred = true;
								UIDefineCodeAction.edit = new vscode.WorkspaceEdit();
								const position = new vscode.Position(lineColumn.line - 1, lineColumn.col);
								UIDefineCodeAction.edit.insert(controllerUri, position, `,\n\n\t\t${attributeData.attributeValue}: function(oEvent) {\n\t\t\t\n\t\t}`);
								UIDefineCodeAction.diagnostics = [diagnostic];
								UIDefineCodeAction.command = {
									command: "vscode.open",
									title: "Open file",
									arguments: [controllerUri, {
										selection: new vscode.Range(
											lineColumn.line + 2, 3,
											lineColumn.line + 2, 3
										)
									}]
								};
								providerResult.push(UIDefineCodeAction);
							}
						}
					}
				}
			}
		}

		return providerResult;
	}

}
