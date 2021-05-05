sap.ui.define([
	"com/test/fragmenttest/controller/Master.controller",
	"com/extend/fragmenttest/util/FormatterExtension"
], function(
	MasterController,
	FormatterExtension
) {
	"use strict";

	return MasterController.extend("com.extend.fragmenttest.controller.MasterExtend", {
		formatter: FormatterExtension,
		eventHandler10() {
			"com.extend.fragmenttest.view.fragments.FragmentController2"
		},
		eventHandler11() {},
		unusedEventHandlerExtended() {},
		eventHandler14() {}

	});
});