sap.ui.define([
	"com/test/fragmenttest/util/Formatter"
], function(
	Formatter
) {
	"use strict";

	return Formatter.extend("com.extend.fragmenttest.util.FormatterExtension", {
		formatValueExtensionFragment1() {},
		formatValueFragmentController2() {},
		unusedExtendedFormatValue() {}
	});
});