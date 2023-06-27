import { JSLinters, PropertiesLinters, XMLLinters } from "ui5plugin-linter/dist/classes/Linter";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { TreeItemCollapsibleState } from "vscode";
import ANode from "../../abstraction/ANode";
import LinterNode from "./abstraction/LinterNode";

export default class UsageNode extends LinterNode {
	children: ANode[] = [];
	constructor(parser: IUI5Parser) {
		super(parser, "Usage: ", TreeItemCollapsibleState.None);

		const linters = [
			XMLLinters.TagAttributeLinter,
			XMLLinters.TagLinter,
			XMLLinters.UnusedNamespaceLinter,
			XMLLinters.WrongFilePathLinter,
			JSLinters.WrongFilePathLinter,
			JSLinters.AbstractClassLinter,
			JSLinters.InterfaceLinter,
			JSLinters.PublicMemberLinter,
			JSLinters.UnusedClassLinter,
			JSLinters.WrongClassNameLinter,
			JSLinters.WrongFieldMethodLinter,
			JSLinters.WrongImportLinter,
			JSLinters.WrongParametersLinter,
			JSLinters.WrongOverrideLinter,
			JSLinters.WrongNamespaceLinter,
			JSLinters.UnusedMemberLinter,
			PropertiesLinters.DuplicateTranslationLinter,
			PropertiesLinters.UnusedTranslationsLinter
		];
		const severities = linters.map(linter => ({
			linter: linter,
			used: this._linterConfig.getLinterUsage(linter)
		}));
		this.label += JSON.stringify(severities);
		this.iconPath = this._buildIconPath("question-mark.svg");
	}
}