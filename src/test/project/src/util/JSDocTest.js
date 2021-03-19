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
		}
	});
});