import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { JSLinter } from "../providers/diagnostics/js/jslinter/JSLinter";
import { WrongFieldMethodLinter } from "../providers/diagnostics/js/jslinter/parts/WrongFieldMethodLinter";
import { WrongParametersLinter } from "../providers/diagnostics/js/jslinter/parts/WrongParametersLinter";
import { PropertiesLinter } from "../providers/diagnostics/properties/PropertiesLinter";
import { XMLLinter } from "../providers/diagnostics/xml/xmllinter/XMLLinter";
import { UIClassFactory } from "../UI5Classes/UIClassFactory";

let xmlDiagnosticCollection: vscode.DiagnosticCollection;
let jsDiagnosticCollection: vscode.DiagnosticCollection;
let propertiesDiagnosticCollection: vscode.DiagnosticCollection;
export class CustomDiagnostics extends vscode.Diagnostic {
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	attribute?: string;
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
			if (event) {
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
		const errors = await PropertiesLinter.getLintingErrors(document);

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(error.range, error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.source = error.source;
			diagnostic.tags = error.tags;
			diagnostic.severity = error.severity !== undefined ? error.severity : vscode.DiagnosticSeverity.Warning;

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
		const isXMLDiagnosticsEnabled = vscode.workspace.getConfiguration("ui5.plugin").get("xmlDiagnostics");

		if (isXMLDiagnosticsEnabled && !this._timeoutId) {
			this._timeoutId = setTimeout(() => {
				const errors = XMLLinter.getLintingErrors(document);

				const diagnostics: CustomDiagnostics[] = errors.map(error => {
					const diagnostic = new CustomDiagnostics(error.range, error.message);

					diagnostic.code = error.code;
					diagnostic.message = error.message;
					diagnostic.range = error.range;
					diagnostic.severity = error.severity || vscode.DiagnosticSeverity.Error;
					diagnostic.source = error.source;
					diagnostic.relatedInformation = [];
					diagnostic.tags = error.tags || [];
					diagnostic.attribute = error.attribute;

					return diagnostic;
				});

				collection.set(document.uri, diagnostics);
				this._timeoutId = null;
			}, 100);
		}
	}

	private static _updateJSDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, bForce = false) {
		const isJSDiagnosticsEnabled = vscode.workspace.getConfiguration("ui5.plugin").get("jsDiagnostics");

		if (isJSDiagnosticsEnabled && !this._timeoutId) {
			const timeout = this._getTimeoutForDocument(document);
			this._timeoutId = setTimeout(async () => {
				await this._updateDiagnosticCollection(document, collection, bForce);
				this._timeoutId = null;
			}, timeout);
		}
	}

	private static async _updateDiagnosticCollection(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, bForce = false) {
		if (bForce) {
			UIClassFactory.setNewContentForClassUsingDocument(document, true);
		}
		const errors = await JSLinter.getLintingErrors(document);

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(error.range, error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.methodName = error.methodName;
			diagnostic.fieldName = error.fieldName;
			diagnostic.attribute = error.sourceClassName;
			diagnostic.source = error.source;
			diagnostic.isController = error.isController;
			diagnostic.tags = error.tags;
			diagnostic.severity = error.severity !== undefined ? error.severity : vscode.DiagnosticSeverity.Warning;

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
