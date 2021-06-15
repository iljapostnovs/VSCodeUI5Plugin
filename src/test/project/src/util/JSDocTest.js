sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.JSDocTest", {
		init: function() {
			/**@type {sap.m.List} */
			const myVariable;
			myVariable.getItems();

			/**
			 * @protected
			 * @type {string}
			 */
			this._testVariable1 = 123;

			/**@public */
			this._testVariable2 = 123;
		}
	});
});