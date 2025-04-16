sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"./XMLRequireUtil"
], function(
	Controller,
	XMLRequireUtil
) {
	"use strict";

	return Controller.extend("com.test.xmlrequiretest.XMLRequire", {
		/**
		 * @param {sap.m.Button} oButton
		 */
		method1(oButton) {return oButton;},
		requireUtil: new XMLRequireUtil()
	});
});