sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (
	Controller
) {
	"use strict";
	return Controller.extend("com.test.library.control.BaseController", {
		methodFromLibrary: function() {

		},

		_test: function() {
			this.methodFromLibrary();
		}
	});
});
