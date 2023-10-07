import { PackageLinterConfigHandler } from "ui5plugin-linter";
import AMeaningAssumptionGenerator from "ui5plugin-linter/dist/classes/xml/linters/pattern/AMeaningAssumptionGenerator";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { Range, TextEdit, WorkspaceEdit, window, workspace } from "vscode";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";
import { VSCodeTextDocumentTransformer } from "../../utils/VSCodeTextDocumentTransformer";
import { XMLFormatter } from "ui5plugin-linter/dist/classes/formatter/xml/XMLFormatter";

export interface GenerateIDCommandConfig {
	excludeClasses?: string[];
	generateIdsForElements?: boolean;
}

export default class GenerateIDCommand extends AMeaningAssumptionGenerator {
	protected _document: TextDocumentAdapter;
	constructor(document: TextDocumentAdapter, parser: IUI5Parser) {
		const pattern =
			workspace.getConfiguration("ui5.plugin").get<string>("idGenerationFormula") ??
			"id{MeaningAssumption}{Counter}{ControlName}";

		super(pattern, document, parser, new PackageLinterConfigHandler(parser));
		this._document = document;
	}

	async execute() {
		const textEditor = window.activeTextEditor;
		const transformer = new VSCodeTextDocumentTransformer(this._parser);
		const XMLFile = transformer.toXMLFile(this._document.vsCodeDocument);
		if (!XMLFile || !textEditor) {
			throw new Error("View or fragment should be open in order to proceed with id generation");
		}

		const allIds = this._parser.xmlParser.getAllIDsInCurrentView(XMLFile).map(id => id.id);
		const allTags = this._parser.xmlParser.getAllTags(XMLFile).filter(tag => {
			const tagName = this._parser.xmlParser.getClassNameFromTag(tag.text);
			const isAggregation = tagName?.[0].toLowerCase() === tagName[0];
			const isNotClosureTag = !tag.text.startsWith("</");
			return !isAggregation && isNotClosureTag;
		});

		const workspaceEdit = allTags.reduce((edit: WorkspaceEdit, tag) => {
			const idAttribute = tag.attributes?.find(
				attribute => this._parser.xmlParser.getAttributeNameAndValue(attribute).attributeName === "id"
			);
			const controlName = this._parser.xmlParser.getClassNameFromTag(tag.text);
			const fullClassName = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);

			if (!idAttribute && this._checkIfClassIsNotAnException(fullClassName)) {
				const generatedId = this.generateId(tag, allIds);
				const idAttributeText = ` id="${generatedId}"`;
				const attributeOffset = tag.positionBegin + tag.text.indexOf(controlName) + controlName.length;
				const position = this._document.vsCodeDocument.positionAt(attributeOffset);
				edit.insert(this._document.vsCodeDocument.uri, position, idAttributeText);
			}
			return edit;
		}, new WorkspaceEdit());

		if (workspaceEdit.size > 0) {
			await workspace.applyEdit(workspaceEdit);

			const bShouldTagEndingBeOnNewline = workspace
				.getConfiguration("ui5.plugin")
				.get<boolean>("xmlFormatterTagEndingNewline");
			const sFormattedText = new XMLFormatter(this._parser, bShouldTagEndingBeOnNewline).formatDocument(
				this._document
			);
			if (!sFormattedText) {
				return;
			}

			const positionBegin = this._document.vsCodeDocument.positionAt(0);
			const positionEnd = this._document.vsCodeDocument.positionAt(
				this._document.vsCodeDocument.getText().length
			);
			const range = new Range(positionBegin, positionEnd);
			const textEdit = new TextEdit(range, sFormattedText);

			const formatEdit = new WorkspaceEdit();
			formatEdit.set(this._document.vsCodeDocument.uri, [textEdit]);

			await workspace.applyEdit(formatEdit);
		}
	}

	private _checkIfClassIsNotAnException(fullClassName: string) {
		const config =
			workspace.getConfiguration("ui5.plugin").get<GenerateIDCommandConfig>("generateIdsCommandData") ?? {};
		const excludeClasses = config.excludeClasses ?? [];
		const generateIdsForElements = config.generateIdsForElements ?? true;
		let isNotException = true;
		if (excludeClasses.includes(fullClassName)) {
			isNotException = false;
		}
		if (
			isNotException &&
			!generateIdsForElements &&
			!this._parser.classFactory.isClassAChildOfClassB(fullClassName, "sap.ui.core.Control") &&
			this._parser.classFactory.isClassAChildOfClassB(fullClassName, "sap.ui.core.Element")
		) {
			isNotException = false;
		}

		return isNotException;
	}

	generateId(tag: ITag, allIds: string[], replaceTabStop = true) {
		const controlName = this._parser.xmlParser.getClassNameFromTag(tag.text);

		const meaningAssumption = this._generateMeaningAssumption(tag.attributes ?? []);
		let generatedIdWithReplacedVars = this._pattern
			.replace(/\{ControlName\}/g, controlName ?? "")
			.replace(/\{controlName\}/g, this._toFirstCharLower(controlName) ?? "")
			.replace(/\{MeaningAssumption\}/g, meaningAssumption ?? "")
			.replace(/\{meaningAssumption\}/g, this._toFirstCharLower(meaningAssumption) ?? "")
			.replace(/\{TabStop\}/g, replaceTabStop ? "" : "{TabStop}");

		generatedIdWithReplacedVars = this._addCounter(allIds, generatedIdWithReplacedVars);
		allIds.push(generatedIdWithReplacedVars);

		return generatedIdWithReplacedVars;
	}

	private _addCounter(allIds: string[], idWithCounterVar: string, counter = 0): string {
		if (!idWithCounterVar.includes("{Counter}")) {
			return idWithCounterVar;
		}

		const aSameIds = allIds.filter(id => id === idWithCounterVar.replace(/\{Counter\}/g, ""));
		if (aSameIds.length > 0) {
			const hypotheticalId = idWithCounterVar.replace(/\{Counter\}/g, counter.toString());
			const aSameIds = allIds.filter(id => id === hypotheticalId);
			if (aSameIds.length > 0) {
				return this._addCounter(allIds, idWithCounterVar, ++counter);
			} else {
				return hypotheticalId;
			}
		} else {
			return idWithCounterVar.replace(/\{Counter\}/g, "");
		}
	}
}
