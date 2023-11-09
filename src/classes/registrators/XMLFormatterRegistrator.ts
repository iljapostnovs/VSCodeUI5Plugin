import { XMLFormatter } from "ui5plugin-linter/dist/classes/formatter/xml/XMLFormatter";
import { ParserPool } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
export class XMLFormatterRegistrator {
	static register() {
		const disposable = vscode.languages.registerDocumentFormattingEditProvider(
			{ language: "xml" },
			{
				provideDocumentFormattingEdits: document => {
					const parser = ParserPool.getParserForFile(document.fileName);
					if (!parser) {
						return;
					}
					if (document.uri.fsPath.endsWith(".view.xml") || document.uri.fsPath.endsWith(".fragment.xml")) {
						const shouldXmlFormatterTagEndByNewline = vscode.workspace
							.getConfiguration("ui5.plugin")
							.get<boolean>("xmlFormatterTagEndingNewline");
						const shouldXmlFormatterTagSpaceBeforeSelfClose = vscode.workspace
							.getConfiguration("ui5.plugin")
							.get<boolean>("xmlFormatterSpaceAfterSelfTagEnd");

						let indentation = "\t";
						if (vscode.window.activeTextEditor?.options.insertSpaces) {
							const tabSize = vscode.window.activeTextEditor?.options.tabSize;
							if (typeof tabSize === "number") {
								indentation = " ".repeat(tabSize);
							}
						}
						const sFormattedText = new XMLFormatter(parser, {
							shouldXmlFormatterTagEndByNewline,
							shouldXmlFormatterTagSpaceBeforeSelfClose,
							indentation
						}).formatDocument(new TextDocumentAdapter(document));
						if (!sFormattedText) {
							return;
						}

						const positionBegin = document.positionAt(0);
						const positionEnd = document.positionAt(document.getText().length);
						const range = new vscode.Range(positionBegin, positionEnd);
						const textEdit = new vscode.TextEdit(range, sFormattedText);
						return [textEdit];
					} else {
						vscode.window.showInformationMessage("UI5 XML formatter works only for views and fragments");
					}
				}
			}
		);

		UI5Plugin.getInstance().addDisposable(disposable);
	}
}
