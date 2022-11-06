sap.ui.define([
	"com/test/library/control/BaseController",
	"com/test/util/Formatter"
], function(
	BaseController,
	Formatter
) {
	"use strict";
	return BaseController.extend("com.test.controller.BaseController", {
		formatter: Formatter,
		_test: function() {
			//
		},

		getModel: function(sModelName) {
			return this.getView().getModel(sModelName) || this.getOwnerComponent().getModel(sModelName);
		}
	});
});