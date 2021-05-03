sap.ui.define([
	"com/test/controller/BaseController"
], function(
	BaseController
) {
	"use strict";

	return BaseController.extend("com.test.controller.ExtendControllerTest", {
		/**
		 * @override
		 */
		methodFromLibrary: function() {
			BaseController.prototype.methodFromLibrary.apply(this, arguments);
		}
	});
});