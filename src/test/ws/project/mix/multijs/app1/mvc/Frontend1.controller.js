sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/test/mix/multi/js/app1/mvc/Frontend1Model"
], function(
	Controller,
	Frontend1Model
) {
	"use strict";

	return Controller.extend("com.test.mix.multi.js.app1.mvc.Frontend1", {
		/**
		 * @override
		 */
		onInit() {
			Controller.prototype.onInit.apply(this, arguments);
			this.getView().setModel(new Frontend1Model());
		}
	});
});