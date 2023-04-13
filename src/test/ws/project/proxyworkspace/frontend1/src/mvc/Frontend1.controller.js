sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/test/proxyworkspace/frontend2/mvc/Frontend2Model"
], function(
	Controller,
	Frontend2Model
) {
	"use strict";

	return Controller.extend("com.test.proxyworkspace.frontend1.mvc.Frontend1", {
		/**
		 * @override
		 */
		onInit() {
			Controller.prototype.onInit.apply(this, arguments);
			const oModel = new Frontend2Model();

		}
	});
});