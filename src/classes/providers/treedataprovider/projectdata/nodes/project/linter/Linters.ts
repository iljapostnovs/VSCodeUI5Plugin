import { JSLinters, PropertiesLinters, XMLLinters } from "ui5plugin-linter/dist/classes/Linter";

export default [
	XMLLinters.TagAttributeLinter,
	XMLLinters.TagAttributeDefaultValueLinter,
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
	JSLinters.EventTypeLinter,
	PropertiesLinters.DuplicateTranslationLinter,
	PropertiesLinters.UnusedTranslationsLinter
];
