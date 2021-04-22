sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.IfLinterTest", {
		test: function() {
			if (this.dummyField) {

			} else if (this.secondDummyField) {

			}
		}
	});
});