sap.ui.define([
	"sap/m/List"
], function(
	List
) {
	"use strict";

	return sap.ui.controller("com.test.controller.ControllerExtension", {
		extensionMethod: function(aStrings) {
			return new List();
		}
	});
});