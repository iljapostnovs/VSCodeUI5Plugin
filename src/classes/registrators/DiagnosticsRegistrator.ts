import * as vscode from "vscode";
import { XMLLinter } from "../xmllinter/XMLLinter";
import { UI5Plugin } from "../../UI5Plugin";
import { JSLinter } from "../jslinter/JSLinter";

let xmlDiagnosticCollection: vscode.DiagnosticCollection;
let jsDiagnosticCollection: vscode.DiagnosticCollection;
export class CustomDiagnostics extends vscode.Diagnostic {
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	sourceClassName?: string;
	isController?: boolean;
}

export enum CustomDiagnosticType {
	NonExistentMethod = 1,
	NonExistentField = 2
}
export class DiagnosticsRegistrator {
	static register() {
		xmlDiagnosticCollection = vscode.languages.createDiagnosticCollection("XML");
		jsDiagnosticCollection = vscode.languages.createDiagnosticCollection("javascript");

		if (vscode.window.activeTextEditor) {
			const fileName = vscode.window.activeTextEditor.document.fileName;
			if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
				this._updateXMLDiagnostics(vscode.window.activeTextEditor.document, xmlDiagnosticCollection);
			}

			if (fileName.endsWith(".js")) {
				this._updateJSDiagnostics(vscode.window.activeTextEditor.document, jsDiagnosticCollection);
			}
		}

		const changeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
			const fileName = editor?.document.fileName;
			if (editor && fileName) {
				if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
					this._updateXMLDiagnostics(editor.document, xmlDiagnosticCollection);
				}

				if (fileName.endsWith(".js")) {
					this._updateJSDiagnostics(editor.document, jsDiagnosticCollection);
				}
			}
		});

		const textDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
			if (event) {
				const fileName = event.document.fileName;
				if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
					this._updateXMLDiagnostics(event.document, xmlDiagnosticCollection);
				}

				if (fileName.endsWith(".js")) {
					this._updateJSDiagnostics(event.document, jsDiagnosticCollection);
				}
			}
		});

		UI5Plugin.getInstance().addDisposable(changeActiveTextEditor);
		UI5Plugin.getInstance().addDisposable(textDocumentChange);
	}

	public static removeDiagnosticForUri(uri: vscode.Uri, type: string) {
		if (type === "js") {
			jsDiagnosticCollection.delete(uri);
		} else if (type === "xml") {
			xmlDiagnosticCollection.delete(uri);
		}
	}

	private static _timeoutId: NodeJS.Timeout | null;
	private static _updateXMLDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
		const isXMLDiagnosticsEnabled = vscode.workspace.getConfiguration("ui5.plugin").get("xmlDiagnostics");

		if (isXMLDiagnosticsEnabled && !this._timeoutId) {
			this._timeoutId = setTimeout(() => {
				const errors = XMLLinter.getLintingErrors(document.getText());

				const diagnostics: vscode.Diagnostic[] = errors.map(error => {
					return ({
						code: error.code,
						message: error.message,
						range: error.range,
						severity: vscode.DiagnosticSeverity.Error,
						source: error.source,
						relatedInformation: [],
						tags: error.tags || []
					});
				});

				collection.set(document.uri, diagnostics);
				this._timeoutId = null;
			}, 100);
		}
	}

	private static _updateJSDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
		const isJSDiagnosticsEnabled = vscode.workspace.getConfiguration("ui5.plugin").get("jsDiagnostics");

		if (isJSDiagnosticsEnabled && !this._timeoutId) {
			this._timeoutId = setTimeout(() => {
				const errors = JSLinter.getLintingErrors(document);

				const diagnostics: CustomDiagnostics[] = errors.map(error => {
					const diagnostic = new CustomDiagnostics(error.range, error.message);

					diagnostic.code = error.code;
					diagnostic.severity = vscode.DiagnosticSeverity.Warning;
					diagnostic.type = error.type;
					diagnostic.methodName = error.methodName;
					diagnostic.fieldName = error.fieldName;
					diagnostic.sourceClassName = error.sourceClassName;
					diagnostic.isController = error.isController;

					return diagnostic;
				});

				collection.set(document.uri, diagnostics);
				this._timeoutId = null;
			}, 100);
		}
	}
}
