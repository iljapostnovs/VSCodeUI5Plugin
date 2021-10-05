import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { RangeAdapter } from "../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { VSCodeSeverityAdapter } from "../ui5linter/adapters/VSCodeSeverityAdapter";
import { JSLinter } from "../ui5linter/js/JSLinter";
import { PropertiesLinter } from "../ui5linter/properties/PropertiesLinter";
import { XMLLinter } from "../ui5linter/xml/XMLLinter";
import { WrongFieldMethodLinter } from "ui5plugin-linter/dist/classes/js/parts/WrongFieldMethodLinter";
import { WrongParametersLinter } from "ui5plugin-linter/dist/classes/js/parts/WrongParametersLinter";

let xmlDiagnosticCollection: vscode.DiagnosticCollection;
let jsDiagnosticCollection: vscode.DiagnosticCollection;
let propertiesDiagnosticCollection: vscode.DiagnosticCollection;
export class CustomDiagnostics extends vscode.Diagnostic {
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	attribute?: string;
}

export enum CustomDiagnosticType {
	NonExistentMethod = 1,
	NonExistentField = 2
}
export class DiagnosticsRegistrator {
	static register() {
		xmlDiagnosticCollection = vscode.languages.createDiagnosticCollection("XML");
		jsDiagnosticCollection = vscode.languages.createDiagnosticCollection("javascript");
		propertiesDiagnosticCollection = vscode.languages.createDiagnosticCollection("properties");

		if (vscode.window.activeTextEditor) {
			const fileName = vscode.window.activeTextEditor.document.fileName;
			if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
				this._updateXMLDiagnostics(vscode.window.activeTextEditor.document, xmlDiagnosticCollection);
			}

			if (fileName.endsWith(".js")) {
				this._updateJSDiagnostics(vscode.window.activeTextEditor.document, jsDiagnosticCollection);
			}

			if (fileName.endsWith(".properties")) {
				this._updatePropertiesDiagnostics(vscode.window.activeTextEditor.document, propertiesDiagnosticCollection);
			}
		}

		const changeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
			const fileName = editor?.document.fileName;
			if (editor && fileName) {
				if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
					this._updateXMLDiagnostics(editor.document, xmlDiagnosticCollection);
				}

				if (fileName.endsWith(".js")) {
					this._updateJSDiagnostics(editor.document, jsDiagnosticCollection, true);
				}

				if (fileName.endsWith(".properties")) {
					this._updatePropertiesDiagnostics(editor.document, propertiesDiagnosticCollection);
				}
			}
		});

		const textDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length > 0) {
				const fileName = event.document.fileName;
				if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
					this._updateXMLDiagnostics(event.document, xmlDiagnosticCollection);
				}

				if (fileName.endsWith(".js")) {
					this._updateJSDiagnostics(event.document, jsDiagnosticCollection);
				}

				if (fileName.endsWith(".properties")) {
					this._updatePropertiesDiagnostics(event.document, propertiesDiagnosticCollection);
				}
			}
		});

		UI5Plugin.getInstance().addDisposable(changeActiveTextEditor);
		UI5Plugin.getInstance().addDisposable(textDocumentChange);
	}
	private static async _updatePropertiesDiagnostics(document: vscode.TextDocument, propertiesDiagnosticCollection: vscode.DiagnosticCollection) {
		const errors = new PropertiesLinter().getLintingErrors(new TextDocumentAdapter(document));

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(RangeAdapter.rangeToVSCodeRange(error.range), error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.source = error.source;
			diagnostic.tags = error.tags;
			diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);

			return diagnostic;
		});

		propertiesDiagnosticCollection.set(document.uri, diagnostics);
	}

	public static removeDiagnosticForUri(uri: vscode.Uri, type: string) {
		if (type === "js") {
			jsDiagnosticCollection.delete(uri);
		} else if (type === "xml") {
			xmlDiagnosticCollection.delete(uri);
		} else if (type === "properties") {
			propertiesDiagnosticCollection.delete(uri);
		}
	}

	static updateDiagnosticCollection(document: vscode.TextDocument) {
		const fileName = document.fileName;
		if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
			this._updateXMLDiagnostics(document, xmlDiagnosticCollection);
		} else if (fileName.endsWith(".js")) {
			this._updateJSDiagnostics(document, jsDiagnosticCollection);
		} else if (fileName.endsWith(".properties")) {
			this._updatePropertiesDiagnostics(document, propertiesDiagnosticCollection);
		}
	}

	private static _timeoutId: NodeJS.Timeout | null;
	private static _updateXMLDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {

		if (!this._timeoutId) {
			this._timeoutId = setTimeout(() => {
				console.time("XML Linter");
				const errors = new XMLLinter().getLintingErrors(new TextDocumentAdapter(document));
				console.timeEnd("XML Linter");

				const diagnostics: CustomDiagnostics[] = errors.map(error => {
					const diagnostic = new CustomDiagnostics(RangeAdapter.rangeToVSCodeRange(error.range), error.message);

					diagnostic.code = error.code;
					diagnostic.message = error.message;
					diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);
					diagnostic.source = error.source;
					diagnostic.relatedInformation = [];
					diagnostic.tags = error.tags || [];
					//TODO: this
					diagnostic.attribute = error.attribute;

					return diagnostic;
				});

				collection.set(document.uri, diagnostics);
				this._timeoutId = null;
			}, 100);
		}
	}

	private static async _updateJSDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, bForce = false) {
		if (!this._timeoutId) {
			const timeout = this._getTimeoutForDocument(document);
			if (!timeout) {
				this._timeoutId = setTimeout(() => {/**dummy timeout*/ });
				await this._updateDiagnosticCollection(document, collection, bForce);
				this._timeoutId = null;
			} else {
				this._timeoutId = setTimeout(async () => {
					await this._updateDiagnosticCollection(document, collection, bForce);
					this._timeoutId = null;
				}, timeout);

			}
		}
	}

	private static async _updateDiagnosticCollection(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, bForce = false) {
		if (bForce) {
			UI5Plugin.getInstance().parser.classFactory.setNewContentForClassUsingDocument(new TextDocumentAdapter(document), true);
		}
		console.time("JS Linter");
		const errors = new JSLinter().getLintingErrors(new TextDocumentAdapter(document));
		console.timeEnd("JS Linter");

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(RangeAdapter.rangeToVSCodeRange(error.range), error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.methodName = error.methodName;
			diagnostic.fieldName = error.fieldName;
			diagnostic.attribute = error.sourceClassName;
			diagnostic.source = error.source;
			diagnostic.tags = error.tags;
			diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);

			return diagnostic;
		});

		collection.set(document.uri, diagnostics);
	}

	private static _getTimeoutForDocument(document: vscode.TextDocument) {
		let timeout = 0;
		const approximateTime = WrongFieldMethodLinter.timePerChar * document.getText().length + WrongParametersLinter.timePerChar * document.getText().length;
		if (approximateTime < 75) {
			timeout = 0;
		} else {
			timeout = 100;
		}

		return timeout;
	}
}
