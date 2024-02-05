import { PackageLinterConfigHandler } from "ui5plugin-linter";
import AMeaningAssumptionGenerator from "ui5plugin-linter/dist/classes/xml/linters/pattern/AMeaningAssumptionGenerator";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { workspace } from "vscode";
import { TextDocumentAdapter } from "../../adapters/vscode/TextDocumentAdapter";

export default class GenerateEventCommand extends AMeaningAssumptionGenerator {
	protected _document: TextDocumentAdapter;
	constructor(document: TextDocumentAdapter, parser: IUI5Parser) {
		const pattern =
			workspace.getConfiguration("ui5.plugin").get<string>("eventHandlerGenerationFormula") ??
			"on{MeaningAssumption}{TabStop}{ControlName}{EventName}";

		super(pattern, document, parser, new PackageLinterConfigHandler(parser));
		this._document = document;
	}

	generateEvent(tag: ITag, eventName: string, replaceTabStop = true) {
		const controlName = this._parser.xmlParser.getClassNameFromTag(tag.text);

		const meaningAssumption = this._generateMeaningAssumption(tag.attributes ?? []);
		const newEventName = this._pattern
			.replace(/\{ControlName\}/g, controlName ?? "")
			.replace(/\{controlName\}/g, this._toFirstCharLower(controlName) ?? "")
			.replace(/\{MeaningAssumption\}/g, meaningAssumption ?? "")
			.replace(/\{meaningAssumption\}/g, this._toFirstCharLower(meaningAssumption) ?? "")
			.replace(/\{EventName\}/g, this._toFirstCharUpper(eventName) ?? "")
			.replace(/\{eventName\}/g, this._toFirstCharLower(eventName) ?? "")
			.replace(/\{TabStop\}/g, replaceTabStop ? "" : "{TabStop}");

		return newEventName;
	}
}
