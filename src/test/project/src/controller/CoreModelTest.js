sap.ui.define([
	"com/test/controller/BaseController"
], function(
	BaseController
) {
	"use strict";

	return BaseController.extend("com.test.controller.CoreModelTest", {
		onInit: function() {
			this.getView().setModel(sap.ui.getCore().getModel());
			this.getView().getModel().testMethod();
		}
	});
});