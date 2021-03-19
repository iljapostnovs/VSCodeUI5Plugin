sap.ui.define([
	"com/test/controller/BaseController"
], function(
	BaseController
) {
	"use strict";

	return BaseController.extend("com.test.controller.Detail", {
		onInit: function() {
			this.getView().setModel(this.getModel("TestModel"));
			this.getView().byId("idPage").setModel(this.getModel("AnotherModel"), "TestAnotherModel");
			this.getView().getModel().testMethod();
			this.getModel("TestAnotherModel").anotherMethod();
		}
	});
});