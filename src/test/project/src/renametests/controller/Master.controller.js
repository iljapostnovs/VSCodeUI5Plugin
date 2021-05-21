sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/test/renametests/util/Formatter"
], function(
	Controller,
	Formatter
) {
	"use strict";

	return Controller.extend("com.test.renametests.controller.Master", {
		formatter: Formatter,
		eventHandler1() {
			"com.test.renametests.view.fragments.FragmentController1";
		},
		eventHandler2() {
			this.getView().byId("")
		},
		eventHandler3() { },
		eventHandler4() { },
		eventHandler12() { },
		unusedEventHandler() { }
	});
});