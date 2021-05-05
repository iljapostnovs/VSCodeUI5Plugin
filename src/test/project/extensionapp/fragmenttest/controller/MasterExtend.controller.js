sap.ui.define([
	"com/test/fragmenttest/controller/Master.controller"
], function(
	MasterController
) {
	"use strict";

	return MasterController.extend("com.extend.fragmenttest.controller.MasterExtend", {
		formatter: FormatterExtension,
		eventHandler10() {
			"com.extend.fragmenttest.view.fragments.FragmentController2"
		},
		eventHandler11() {}
	});
});