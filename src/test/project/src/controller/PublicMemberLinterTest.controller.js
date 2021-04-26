sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("com.test.controller.PublicMemberLinterTest", {
		publicUnusedField: 123,
		publicUsedField: 123,
		_privateField: "123",
		/**
		 * @override
		 */
		onInit: function() {
			"com.test.view.fragments.PublicMemberLinterTest";
			this._privateMethod();
			this.publicUnusedMethod();

			this.secondUnusedPublicField = 123;
		},

		_privateMethod: function() {

		},

		publicUnusedMethod: function() {

		},

		publicUsedMethodInOtherClass: function() {

		},

		publicUsedMethodInView: function() {

		},

		publicUsedMethodInFragment: function() {

		},

		secondPublicUsedMethodInView: function() {

		},

		secondPublicUsedMethodInFragment: function() {

		},

		onpaste: function() {

		},

		onclick: function() {

		}
	});
});