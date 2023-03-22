import { ParserPool, UI5JSParser, UI5TSParser } from "ui5plugin-parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../UI5Plugin";
import { RangeAdapter } from "../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../adapters/vscode/TextDocumentAdapter";
import { VSCodeSeverityAdapter } from "../ui5linter/adapters/VSCodeSeverityAdapter";
import { JSLinter } from "../ui5linter/js/JSLinter";
import { PropertiesLinter } from "../ui5linter/properties/PropertiesLinter";
import { TSLinter } from "../ui5linter/ts/TSLinter";
import { XMLLinter } from "../ui5linter/xml/XMLLinter";

let xmlDiagnosticCollection: vscode.DiagnosticCollection;
let jsDiagnosticCollection: vscode.DiagnosticCollection;
let tsDiagnosticCollection: vscode.DiagnosticCollection;
let propertiesDiagnosticCollection: vscode.DiagnosticCollection;
export class CustomDiagnostics extends vscode.Diagnostic {
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	attribute?: string;
	acornNode?: any;
}

export enum CustomDiagnosticType {
	NonExistentMethod = 1,
	NonExistentField = 2
}
export class DiagnosticsRegistrator {
	static register() {
		xmlDiagnosticCollection = vscode.languages.createDiagnosticCollection("XML");
		propertiesDiagnosticCollection = vscode.languages.createDiagnosticCollection("properties");

		jsDiagnosticCollection = vscode.languages.createDiagnosticCollection("javascript");
		tsDiagnosticCollection = vscode.languages.createDiagnosticCollection("typescript");

		if (vscode.window.activeTextEditor) {
			this.updateDiagnosticCollection(vscode.window.activeTextEditor.document);
		}

		const changeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
			const fileName = editor?.document.fileName;
			if (editor && fileName) {
				this.updateDiagnosticCollection(editor.document, true);
			}
		});

		const textDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length > 0) {
				DiagnosticsRegistrator.updateDiagnosticCollection(event.document);
			}
		});

		UI5Plugin.getInstance().addDisposable(changeActiveTextEditor);
		UI5Plugin.getInstance().addDisposable(textDocumentChange);
	}

	private static async _updatePropertiesDiagnostics(
		document: vscode.TextDocument,
		propertiesDiagnosticCollection: vscode.DiagnosticCollection
	) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser) {
			return;
		}
		const errors = new PropertiesLinter(parser).getLintingErrors(new TextDocumentAdapter(document));

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

	public static removeDiagnosticForUri(uri: vscode.Uri, type: "js" | "ts" | "xml" | "properties") {
		if (type === "js") {
			jsDiagnosticCollection.delete(uri);
		} else if (type === "xml") {
			xmlDiagnosticCollection.delete(uri);
		} else if (type === "properties") {
			propertiesDiagnosticCollection.delete(uri);
		} else if (type === "ts") {
			tsDiagnosticCollection.delete(uri);
		}
	}

	static updateDiagnosticCollection(document: vscode.TextDocument, bForce = false) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser) {
			return;
		}
		const fileName = document.fileName;
		if (fileName.endsWith(".fragment.xml") || fileName.endsWith(".view.xml")) {
			if (document.fileName.endsWith(".fragment.xml")) {
				parser.fileReader.setNewFragmentContentToCache(document.getText(), document.fileName);
			} else if (document.fileName.endsWith(".view.xml")) {
				parser.fileReader.setNewViewContentToCache(document.getText(), document.fileName);
			}
			this._updateXMLDiagnostics(document, xmlDiagnosticCollection);
		} else if (fileName.endsWith(".js")) {
			const className = parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				parser.classFactory.setNewCodeForClass(className, document.getText(), bForce);
			}
			this._updateJSDiagnostics(document, jsDiagnosticCollection);
		} else if (fileName.endsWith(".ts")) {
			const className = parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				parser.classFactory.setNewCodeForClass(className, document.getText(), bForce);
			}
			this._updateTSDiagnostics(document, tsDiagnosticCollection);
		} else if (fileName.endsWith(".properties")) {
			this._updatePropertiesDiagnostics(document, propertiesDiagnosticCollection);
		}
	}

	private static _timeoutId: NodeJS.Timeout | null;
	private static _updateXMLDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser) {
			return;
		}
		if (!this._timeoutId) {
			this._timeoutId = setTimeout(() => {
				const errors = new XMLLinter(parser).getLintingErrors(new TextDocumentAdapter(document));

				const diagnostics: CustomDiagnostics[] = errors.map(error => {
					const diagnostic = new CustomDiagnostics(
						RangeAdapter.rangeToVSCodeRange(error.range),
						error.message
					);

					diagnostic.code = error.code;
					diagnostic.message = error.message;
					diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);
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

	private static _updateJSDiagnostics(document: vscode.TextDocument, collection?: vscode.DiagnosticCollection) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser || !(parser instanceof UI5JSParser)) {
			return;
		}
		const errors = new JSLinter(parser).getLintingErrors(new TextDocumentAdapter(document));

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(RangeAdapter.rangeToVSCodeRange(error.range), error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.methodName = error.methodName;
			diagnostic.acornNode = error.acornNode;
			diagnostic.fieldName = error.fieldName;
			diagnostic.attribute = error.sourceClassName;
			diagnostic.source = error.source;
			diagnostic.tags = error.tags;
			diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);

			return diagnostic;
		});

		collection?.set(document.uri, diagnostics);
	}

	private static _updateTSDiagnostics(document: vscode.TextDocument, collection?: vscode.DiagnosticCollection) {
		const parser = ParserPool.getParserForFile(document.fileName);
		if (!parser || !(parser instanceof UI5TSParser)) {
			return;
		}
		const errors = new TSLinter(parser).getLintingErrors(new TextDocumentAdapter(document));

		const diagnostics: CustomDiagnostics[] = errors.map(error => {
			const diagnostic = new CustomDiagnostics(RangeAdapter.rangeToVSCodeRange(error.range), error.message);

			diagnostic.code = error.code;
			diagnostic.severity = vscode.DiagnosticSeverity.Hint;
			diagnostic.type = error.type;
			diagnostic.methodName = error.methodName;
			diagnostic.acornNode = error.acornNode;
			diagnostic.fieldName = error.fieldName;
			diagnostic.attribute = error.sourceClassName;
			diagnostic.source = error.source;
			diagnostic.tags = error.tags;
			diagnostic.severity = VSCodeSeverityAdapter.toVSCodeSeverity(error.severity);

			return diagnostic;
		});

		collection?.set(document.uri, diagnostics);
	}
}
