sap.ui.define([
	"com/test/library/control/BaseController"
], function(
	BaseController
) {
	"use strict";
	return BaseController.extend("com.test.controller.BaseController", {
		_test: function() {
			//
		},

		getModel: function(sModelName) {
			return this.getView().getModel(sModelName) || this.getOwnerComponent().getModel(sModelName);
		}
	});
});