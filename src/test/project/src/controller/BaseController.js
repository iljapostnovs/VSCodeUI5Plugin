sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (
	Controller
) {
	"use strict";
	return Controller.extend("com.test.controller.BaseController", {
		_test: function() {
			//
		},

		getModel: function(sModelName) {
			return this.getView().getModel(sModelName) || this.getOwnerComponent().getModel(sModelName);
		}
	});
});
