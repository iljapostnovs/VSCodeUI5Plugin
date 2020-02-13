import * as vscode from "vscode";
import { XMLLinter } from "../XMLLinter";

let diagnosticCollection: vscode.DiagnosticCollection;

export class DiagnosticsRegistrator {
	static register(context: vscode.ExtensionContext) {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("xmlDiagnostics")) {
			diagnosticCollection = vscode.languages.createDiagnosticCollection("XML");

			if (vscode.window.activeTextEditor) {
				this.updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
			}

			const changeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
				if (editor && editor.document.fileName.endsWith(".xml")) {
					this.updateDiagnostics(editor.document, diagnosticCollection);
				}
			});

			const textDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
				if (event && event.document.fileName.endsWith(".xml")) {
					this.updateDiagnostics(event.document, diagnosticCollection);
				}
			});

			context.subscriptions.push(changeActiveTextEditor);
			context.subscriptions.push(textDocumentChange);
			context.subscriptions.push(diagnosticCollection);
		}
	}

	private static updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
		const errors = XMLLinter.lintDocument(document.getText());
		const diagnostics: vscode.Diagnostic[] = errors.map(error => {
			return ({
				code: error.code,
				message: error.message,
				range: error.range,
				severity: vscode.DiagnosticSeverity.Error,
				source: error.source,
				relatedInformation: []
			});
		});

		collection.set(document.uri, diagnostics);
	}
}
