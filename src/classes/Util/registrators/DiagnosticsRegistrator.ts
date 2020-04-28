import * as vscode from "vscode";
import { XMLLinter } from "../XMLLinter";
import { UI5Plugin } from "../../../UI5Plugin";

let diagnosticCollection: vscode.DiagnosticCollection;

export class DiagnosticsRegistrator {
	static register() {
		if (vscode.workspace.getConfiguration("ui5.plugin").get("xmlDiagnostics")) {
			diagnosticCollection = vscode.languages.createDiagnosticCollection("XML");

			if (vscode.window.activeTextEditor) {
				const fileName = vscode.window.activeTextEditor.document.fileName;
				if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
					this.updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
				}
			}

			const changeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
				const fileName = editor?.document.fileName;
				if (editor && fileName && (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml"))) {
					this.updateDiagnostics(editor.document, diagnosticCollection);
				}
			});

			const textDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
				if (event && (event.document.fileName.endsWith(".fragment.xml") || event.document.fileName.endsWith(".view.xml"))) {
					this.updateDiagnostics(event.document, diagnosticCollection);
				}
			});

			UI5Plugin.getInstance().addDisposable(changeActiveTextEditor);
			UI5Plugin.getInstance().addDisposable(textDocumentChange);
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
